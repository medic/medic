#!/bin/bash

# Add MEDIC_URL to script executing on ec2 init
echo $MEDIC_URL
sed -i '2s~^~'MEDIC_URL=$MEDIC_URL'\n~' run_suite.sh
cat run_suite.sh
# base64 encode our script and set as value for UserDAta in launch-specification
jq '.UserData = "'$(base64 run_suite.sh -w 0)'"' launch-specification.json >> launch-specification-jmeter.json
cat launch-specification-jmeter.json
aws ec2 request-spot-instances --spot-price '0.222' --instance-count 1 --type 'one-time' --launch-specification file://launch-specification-jmeter.json --block-duration-minutes 60