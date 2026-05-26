import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]


def _get_table():
    kwargs = {}
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)


def _scan_all(table):
    """Full scan with pagination."""
    connections = []
    kwargs = {"ProjectionExpression": "connectionId"}
    while True:
        response = table.scan(**kwargs)
        connections.extend(response["Items"])
        if "LastEvaluatedKey" not in response:
            break
        kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
    return connections


def handler(event, context):
    try:
        ctx = event["requestContext"]
        connection_id = ctx["connectionId"]
        domain_name = ctx["domainName"]
        stage = ctx["stage"]

        # Parse and validate body
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return {"statusCode": 400, "body": "Missing or invalid text"}

        text = body.get("text")
        if not text or not isinstance(text, str):
            return {"statusCode": 400, "body": "Missing or invalid text"}
        text = text.strip()
        if not text or len(text) > 1000:
            return {"statusCode": 400, "body": "Missing or invalid text"}

        table = _get_table()

        # Get sender's callsign from DynamoDB (not from body — prevents spoofing)
        response = table.get_item(Key={"connectionId": connection_id})
        sender = response.get("Item")
        if not sender:
            return {"statusCode": 400, "body": "Unknown sender"}
        callsign = sender["callsign"]

        # Build broadcast payload
        payload = json.dumps({
            "type": "message",
            "callsign": callsign,
            "text": text,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }).encode("utf-8")

        # Fan-out to all connections
        connections = _scan_all(table)
        endpoint_url = f"https://{domain_name}/{stage}"
        apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

        for conn in connections:
            cid = conn["connectionId"]
            try:
                apigw.post_to_connection(ConnectionId=cid, Data=payload)
            except apigw.exceptions.GoneException:
                try:
                    table.delete_item(Key={"connectionId": cid})
                except Exception:
                    pass
            except Exception as e:
                logger.error("Failed to send to %s: %s", cid, e)

        return {"statusCode": 200, "body": "Message sent"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
