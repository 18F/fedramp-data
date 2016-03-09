This repository has been created for the [Create a Google Script to convert Google Sheet Data into a JSON](https://micropurchase.18f.gov/auctions/21) Micro-purchase.

## About this Repository
The Federal Risk and Authorization Management Program, or FedRAMP, is a government-wide program that provides a standardized approach to security assessment, authorization, and continuous monitoring for cloud products and services. This issue seeks a Google Apps Script that will convert a Google Sheet into JSON which adheres to a given schema file.

We use a non-public Google Sheet. Because we cannot make this sheet fully public, we have made available a CSV which has the same fields as the Google Sheet. However, the winner of the auction will be given access to the Google Sheet. It's worth noting that this Google Sheet contains only fake data (and no sensitive data).

Once given access to the Google Sheet, the winner of the auction can begin writing the script. Once the JSON is created is created by the Google script, the script should post the resulting file onto Github using the Github API.

The mapping file indicates how fields from the Google Sheet should be mapped to fields in the JSON. The schema file indicates how packages should be aggregated based on Package ID and displayed in the resulting JSON file produced by the Google Script.

### Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
