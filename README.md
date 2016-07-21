This repository has been created for the [Create a Google Script to convert Google Sheet Data into a JSON](https://micropurchase.18f.gov/auctions/21) Micro-purchase.

## About this Repository
The Federal Risk and Authorization Management Program, or [FedRAMP](https://www.fedramp.gov/), is a government-wide program that provides a standardized approach to security assessment, authorization, and continuous monitoring for cloud products and services. This repository houses the data of a google script driven export of the data. The script was originally developed as an [18f micropurchase](https://micropurchase.18f.gov/auctions/21) to convert a Google Sheet into JSON which adheres to the schema file in this repository. This script will allow future front-end applications to use the FedRamp data.

## About the Data
Any data posted to this repository is not considered up-to-date and should not be construed as such.


The [mapping](https://github.com/18F/fedramp-micropurchase/blob/master/mapping.json) file indicates how fields from the Google Sheet are mapped to fields in the resulting JSON.

The [schema](https://github.com/18F/fedramp-micropurchase/blob/master/schema.json) file indicates how packages is aggregated based on Package ID and displayed in the resulting JSON file produced by the Google Script.

### Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
