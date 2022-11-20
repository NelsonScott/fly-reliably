import json
import boto3

def hello(event, context):
    body = {
        "message": "Go Serverless v3.0! Your function executed successfully!",
        "input": event,
    }

    BUCKET_NAME = 'airlinereliabilitystats'
    key = 'reliabilitymetrics.json'
    s3 = boto3.resource('s3')
    obj = s3.Object(BUCKET_NAME, key)
    fetched_data = obj.get()['Body'].read().decode('utf-8')
    print('did it work?, fetched data:')
    print(fetched_data)
    # file = boto3.resource('s3').Bucket(BUCKET_NAME).download_file(
    #     'jetblue', '/tmp/airline_reliability_stats.csv')
    # print(file)

    response = {"statusCode": 200, "body": fetched_data}

    return response
