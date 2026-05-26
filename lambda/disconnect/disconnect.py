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


def _broadcast_leave(domain_name, stage, callsign, table):
    """Notify remaining connections that a user left."""
    if not domain_name or domain_name == "localhost":
        return
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)
    payload = json.dumps({
        "type": "system",
        "event": "user_left",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")
    try:
        connections = table.scan(ProjectionExpression="connectionId")["Items"]
    except Exception as e:
        logger.error("Scan failed during leave broadcast: %s", e)
        return
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
            logger.warning("Failed to notify %s of leave: %s", cid, e)


def handler(event, context):
    try:
        ctx = event["requestContext"]
        connection_id = ctx["connectionId"]
        domain_name = ctx.get("domainName", "")
        stage = ctx.get("stage", "prod")

        table = _get_table()

        # Get callsign before deleting (best-effort)
        response = table.get_item(Key={"connectionId": connection_id})
        callsign = response.get("Item", {}).get("callsign", "unknown")

        # DeleteItem is idempotent — safe even if key doesn't exist
        table.delete_item(Key={"connectionId": connection_id})

        _broadcast_leave(domain_name, stage, callsign, table)

        return {"statusCode": 200, "body": "Disconnected"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
