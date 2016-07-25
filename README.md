This repository has been created for the [Create a Google Script to convert Google Sheet Data into a JSON](https://micropurchase.18f.gov/auctions/21) Micro-purchase.

## About this Repository
The Federal Risk and Authorization Management Program, or [FedRAMP](https://www.fedramp.gov/), is a government-wide program that provides a standardized approach to security assessment, authorization, and continuous monitoring for cloud products and services. This repository houses the data of a google script driven export of the data. The script was originally developed as an [18f micropurchase](https://micropurchase.18f.gov/auctions/21) to convert a Google Sheet into JSON which adheres to the schema file in this repository. This script will allow future front-end applications to use the FedRamp data.

## About the Data
Any data posted to this repository is not considered up-to-date and should not be construed as such.

The [mapping](https://github.com/18F/fedramp-micropurchase/blob/master/mapping.json) file indicates how fields from the Google Sheet are mapped to fields in the resulting JSON.

The [schema](https://github.com/18F/fedramp-micropurchase/blob/master/schema.json) file indicates how packages is aggregated based on Package ID and displayed in the resulting JSON file produced by the Google Script.

## Updating the Data Model
1. Make sure you have access to the spreadsheet

2. Clone the github repo (or do it on github) - please make sure you've pulled recently as the data file might have changed!

3. Open up mapping.json

4. Add an object for each field you would like to add.

* If your are trying to make an array of objects, please look at the Leveraged_ATO_Letters

* Each object expects the following fields:

 - name: to be used in the exported data file

 - from_sheet: which sheet in the spreadsheet the script should pull from. Default is  "New ATO PATO Log", and you shouldn't need to change this

 - from_field: the title (Row 1) of the column in the spread sheet from which you would like to extract

 - type: what kind of field this will be. Current and expanding options are `String`, `UTCString` (which is handled like a string), `Array of Objects` (which currently has no actual handling - see subfields), `commaArray` will delineate the string field in comma separated array, and `Array` which will separate based on an &

* The mapping.json can also make use of the following optional fields:

 - notes: any notes for the humans to know. this could potentially be useful for the future data dictionary

 - conditionals: an array of objects of whether to limit whether a spreadsheet row should go into the exported json. This is should be for the parent object.

     - column_name: the column name of the column to look for the values

     - acceptable_values: an array of which values the column will be permissible for that row

 - subfields: an array of additional field objects to be nested. Requires `key` and `from_key_value`

 - key: fields that have subfields, (linked to the parent by a key), key is the field in the parent object to link the child to i.e. the package id

 - from_key_value: the column name in the spreadsheet whose value must equal the parent's `key` value to be nested into a field with subfields.

5. For clarity, add the additional field names to the `data` object in the schema.json

6. Commit the changes to a separate branch and PR them to `master`. Changes to mapping.json in `master` will automatically be carried into the export script as the script directly calls the file every time it runs.

### Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
