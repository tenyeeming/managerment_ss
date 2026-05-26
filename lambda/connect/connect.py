import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
CALLSIGN_RE = re.compile(r"^[a-zA-Z0-9_]{1,20}$")


def _get_table():
    kwargs = {}
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)


def _broadcast_join(domain_name, stage, skip_id, callsign, table):
    """Notify existing connections that a new user joined."""
    if not domain_name or domain_name == "localhost":
        return
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)
    payload = json.dumps({
        "type": "system",
        "event": "user_joined",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")
    try:
        connections = table.scan(ProjectionExpression="connectionId")["Items"]
    except Exception as e:
        logger.error("Scan failed during join broadcast: %s", e)
        return
    for conn in connections:
        cid = conn["connectionId"]
        if cid == skip_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            try:
                table.delete_item(Key={"connectionId": cid})
            except Exception:
                pass
        except Exception as e:
            logger.warning("Failed to notify %s of join: %s", cid, e)


def handler(event, context):
    try:
        ctx = event["requestContext"]
        connection_id = ctx["connectionId"]
        domain_name = ctx.get("domainName", "")
        stage = ctx.get("stage", "prod")

        params = event.get("queryStringParameters") or {}
        callsign = params.get("callsign", "")

        if not callsign or not CALLSIGN_RE.match(callsign):
            return {"statusCode": 400, "body": "Invalid or missing callsign"}

        table = _get_table()

        table.put_item(Item={
            "connectionId": connection_id,
            "callsign": callsign,
            "connectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })

        _broadcast_join(domain_name, stage, connection_id, callsign, table)

        return {"statusCode": 200, "body": "Connected"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
