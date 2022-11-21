import pandas as pd 
import boto3
from botocore.exceptions import ClientError
import logging
import json 

# TODO: This could use some cleanup
# Also think about monitoring/observability/logging strategy. 
# When this is executed as a cron, could wrap datadog around it. Or import here

# This script calculates two things, just for hardcoded Jetblue so far
# 1. Percentage of flights that were delayed
# 2. Percentage of flights that were cancelled
logging.info("Starting process_airline_data.py")
df = pd.read_csv("Airline_Delay_Cause.csv")

# see headers with: list(df.columns.values)
carrier_to_reliability_metrics = {}
for carrier_name in df['carrier_name'].unique():
    logging.debug("Processing carrier_name: {}".format(carrier_name))

    # Calculate cancellation rate
    total_cancelled = df.loc[df['carrier_name'] == carrier_name]['arr_cancelled'].sum()
    total_flights = df.loc[df['carrier_name'] == carrier_name]['arr_flights'].sum()
    cancelled_percentage = (total_cancelled / total_flights) * 100
    cancelled_percentage = round(cancelled_percentage, 2)
    logging.debug("cancelled_percentage", cancelled_percentage)

    # Calculate delay rate
    delay_cols = ['carrier_ct', 'weather_ct', 'nas_ct', 'security_ct', 'late_aircraft_ct']
    total_delay = df.loc[df['carrier_name'] == carrier_name][delay_cols].sum().sum()

    total_diverted = df.loc[df['carrier_name'] == carrier_name]['arr_diverted'].sum()
    total_not_ontime = total_delay + total_cancelled + total_diverted

    ontime_percentage = round(100 - (total_not_ontime/total_flights) * 100, 2)
    logging.debug("ontime_percentage", ontime_percentage)
    
    carrier_to_reliability_metrics[carrier_name] = {
        "ontime_percentage": ontime_percentage, 
        "cancelled_percentage": cancelled_percentage
    }

logging.debug("carrier_to_reliability_metrics: {}".format(carrier_to_reliability_metrics))

BUCKET_NAME = 'airlinereliabilitystats'
s3_client = boto3.client('s3')
put_on_s3 = json.dumps(carrier_to_reliability_metrics)
try:
    s3_client.put_object(Body=put_on_s3, Bucket=BUCKET_NAME, Key='reliabilitymetrics.json')
except ClientError as e:
    logging.error(e)