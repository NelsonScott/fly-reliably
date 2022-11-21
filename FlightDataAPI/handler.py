import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

'''
Returns JSON in following format:
{
    "Airline Name": {"ontime_percentage": float, "cancelled_percentage": float},
    ...
}
'''
def hello(event, context):
    # Note: Single line logs are ingested into datadog fine, but json dumps not so much
    # Or, as shown below, don't need to json.dumps at all?
    # Maybe need to tweak log formatting here, or parsing in datadog
    logger.info("Lambda handler starting; Using built-in logger")
    BUCKET_NAME = 'airlinereliabilitystats'
    key = 'reliabilitymetrics.json'

    obj = boto3.resource('s3').Object(BUCKET_NAME, key)
    fetched_data = obj.get()['Body'].read().decode('utf-8')
    logger.info("fetched_data: " + fetched_data)

    response = {"statusCode": 200, "body": fetched_data}

    return response
