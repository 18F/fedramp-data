#!/usr/local/bin/python
import pandas as pd
# script to parse fedramp json into csv
# Mat Caughron April 2020
# for installation run `pip install pandas` 
# first download current json from https://raw.githubusercontent.com/18F/fedramp-data/master/data/data.json
# and then run this script
df = pd.read_json (r'data.json')
export_csv = df.to_csv (r'fedramp-data.csv', index = None)
