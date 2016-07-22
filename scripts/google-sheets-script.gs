/**
 * Please configure these settings as necessary.
 *
 * This script uses a [personal access token](https://github.com/blog/1509-personal-api-tokens) for authentication, which I recommend.
 */
var github = {
        'username': '18F',
        'accessToken': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'repository': 'fedramp-data',
        'branch': 'master',
        'commitMessage': Utilities.formatString('publish P-ATO data on %s', Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'))
    };

var gSheets = {
        'sheetId': 'xxxxxxxxx',
        'sheetName': 'New ATO PATO Log'
    };

/**
* Get `mapping.json` from the `master` branch of the repository.
* Note that `schema.json` is not necessary.
*
* @returns {Object} mappingJsonContents
*/
function getMappingsFromGitHub() {
    var path = 'mapping.json',
        requestUrl = Utilities.formatString(
            'https://api.github.com/repos/%s/%s/contents/%s',
            github.username,
            github.repository,
            path
        ),
        response = UrlFetchApp.fetch(requestUrl, {
            'method': 'GET',
            'headers': {
                'Accept': 'application/vnd.github.VERSION.raw',
                'Authorization': Utilities.formatString('token %s', github['accessToken'])
            }
        });

    return JSON.parse(response.getContentText());
}

/**
* Parse each field value according to its type.
*
* @param            fieldValue
* @param   {string} fieldType
* @returns          parsedValue
*/
function parseField(fieldValue, fieldType) {
switch (fieldType) {
    case 'String':
    case 'UTCString':
        return fieldValue;
        break;

    case 'Array':
        return fieldValue.split('&');
        break;

    case 'commaArray':
        return fieldValue.split(', ');
        break;
    }
}

/**
* Checks if a row meets an individual condition
* @param   {array}  columnFields - the name of each column for the sheet
* @param   {array} desiredValue - an array of acceptable vaules
* @param   {string} columnName - the name of the column to search for the values in
* @param   {array}  row - an array of the field values for that specific row
* @returns {boolean} whether the column in question includes the acceptable desired values
*/
function meetsConditional(columnFields, desiredValue, columnName, row) {
     var columnNameIndex = columnFields.indexOf(columnName);
    if (include(desiredValue, row[columnNameIndex])) {
        return true;
    }
    return false;
}

/**
* Checks if a row meets all the specified conditions
* @param   {array}  columnFields - the name of each column for the sheet
* @param   {array} condiontalArray - an array of objects of conditions to be met
* @param   {array}  row - an array of the field values for that specific row
* @returns {boolean} whether the column in question includes the acceptable desired values
*/
function meetsAllConditionals(columnFields, conditionalArray, row) {
    var conds = [];
    conditionalArray.forEach(function(conditional) {
        var acceptable = meetsConditional(columnFields, conditional.acceptable_values, conditional.column_name, row);
        conds.push(acceptable);
    });
    var corrects = conds.reduce(getSum);
    if (corrects === conds.length) {
        return true;
    }
    return false;
}

/**
* Helper function for reduce to add sum to total
* @param   {integer} total - running total of the sum
* @param   {integer} num - next element to be added
* @returns {integer} sum of two params
*/
function getSum(total, num) {
  return total + num;
}

/**
* shim for if an array includes a particular object
* @param   {Array} arr - array to be searched
* @param   {Object} obj - object to see if exists
* @returns {Boolean} of if the object can be found in the array
*/
function include(arr, obj) {
  return (arr.indexOf(obj) !== -1);
}

/**
* shim for if an array includes a particular object
* @param   {Array} arr - array to be searched
* @param   {Object} obj - object to see if exists
* @returns {Boolean} of if the object can be found in the array
*/
function generateJson() {
     var mappingJsonContents = getMappingsFromGitHub(),
        mappingFields = mappingJsonContents.fields,
        gSheet = SpreadsheetApp.openById(gSheets.sheetId).getSheetByName(gSheets.sheetName),
        gSheetFields = gSheet.getRange(1, 1, 1, gSheet.getLastColumn()).getValues()[0], // Get the first row of the spreadsheet (that is, the column names).
        responseObject = {},
        date = new Date(),
        jsonData = [];
    responseObject.meta = {};
    responseObject.meta.Created_At = date.toISOString();
    responseObject.meta.Produced_By = "General Services Administration";

    // For each row of our spreadsheet, create a JavaScript object.
    var sheetRows = gSheet.getSheetValues(2, 1, gSheet.getLastRow() - 1, gSheet.getLastColumn());
    sheetRows.forEach(function (row) {
        var acceptable_ATO = meetsAllConditionals(gSheetFields, mappingJsonContents.conditionals, row);
        if (acceptable_ATO) {
            jsonData.push(buildRowObject(row, mappingFields, gSheetFields));
        }
    });// Iterate once to generate all the Original ATOS

    //Iterate Again to handle All leveraged ATOS
    sheetRows.forEach(function (row) {
        buildInnerRow(row, gSheetFields, mappingJsonContents.fields, jsonData);
    }); // End iterate through subfields
    responseObject.data = jsonData;
    return JSON.stringify(responseObject, null, 2);
}

/**
* Builds a row to be pushed into the resulting data object
* @param {Array} row - array of field values from the spreadsheet
* @param {Object} mappingFields - an object of the mappings from the row data to the exported jsonData
* @param {Array} gSheetFields - an array of field names (first column values) from the spreadsheet
* @returns {Object} an object of data to be pushed to the final json array
*/
function buildRowObject(row, mappingFields, gSheetFields){
    var jsonRow = {};
    mappingFields.forEach(function (mappingField) {
        var mappingFieldIndex = gSheetFields.indexOf(mappingField.from_field),
            mappingFieldValue = row[mappingFieldIndex];

      // If the field has a value, then parse it according to its type and store it in our row object.
        if (mappingFieldValue) {
            jsonRow[mappingField.name] = parseField(mappingFieldValue, mappingField.type);
        }

      // If the field contains subfields create the array to handle leveraged ATOS.
        if (mappingField.hasOwnProperty('subfields')) {
            jsonRow[mappingField.name] = [];
        }
    });
    return jsonRow;
}

/**
* Builds a row to be pushed into the resulting data object
* @param {Array} row - array of field values from the spreadsheet
* @param {Object} mappingFields - an object of the mappings from the row data to the exported jsonData
* @param {Array} gSheetFields - an array of field names (first column values) from the spreadsheet
* @param {Array} mappingFields - an array of objects on the mapping fields
* @returns {Object} an object of data to be pushed to the final json array
*/
function buildInnerRow (row, gSheetFields, parentFields, jsonData) {
  parentFields.forEach(function (parentField) {
        if (parentField.hasOwnProperty('conditionals')) {
            var acceptable = meetsAllConditionals(gSheetFields, parentField.conditionals, row);
        } else {
            var acceptable = true;
        }

        if (acceptable && parentField.hasOwnProperty('subfields')) {
            var mappingSubfields = parentField.subfields,
                keyIndex = gSheetFields.indexOf(parentField.from_key_value); //Find the link between the subfields and the parent
            jsonData.forEach(function (ATORow, jsonIndex) {
                if (ATORow[parentField.key] === row[keyIndex]) {
                //Push the subfields
                    var subfieldObj = buildRowObject(row, mappingSubfields, gSheetFields);
                    jsonData[jsonIndex][parentField.name].push(subfieldObj);
                }
            });
        }
    });
  return jsonData;
}

/**
* Will rely on the generateJson function and then save that file to google Drive
*
*/
function saveJson() {
    var filename = 'data',
        jsonData = generateJson();
    DriveApp.createFile(filename, jsonData, MimeType.PLAIN_TEXT);
}

function getOldBlobSha() {
    var path = 'data/data.json',
        requestUrl = Utilities.formatString(
            'https://api.github.com/repos/%s/%s/contents/%s',
            github.username,
            github.repository,
            path
        ),
        response = UrlFetchApp.fetch(requestUrl, {
            'method': 'GET',
            'headers': {
                //'Accept': 'application/vnd.github.VERSION.raw',
                'Authorization': Utilities.formatString('token %s', github['accessToken'])
            }
        }),
        jsonResponse = JSON.parse(response.getContentText());
    return jsonResponse.sha;
}

/**
* Publish a JSON version of our Google Sheet to our repository.
* Please note that, at present, this will not overwrite an existing file with the same name.
*/
function run() {
    var path = 'data.json',
        jsonData = generateJson(),
        requestUrl = Utilities.formatString(
            'https://api.github.com/repos/%s/%s/contents/data/%s',
            github.username,
            github.repository,
            path
        ),
        lastSha = getOldBlobSha(), //Sha from the previous version of the data file, needed to update the script.
        response = UrlFetchApp.fetch(requestUrl, {
            'method': 'PUT',
            'headers': {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Authorization': Utilities.formatString('token %s', github.accessToken)
            },
            'payload': JSON.stringify({
                'path': path,
                'message': github.commitMessage,
                'content': Utilities.base64Encode(jsonData),
                'sha': lastSha,
                'branch': github.branch
            })
        }),
        responseJson = JSON.parse(response.getContentText());

    if (responseJson.hasOwnProperty('content') && responseJson.content.hasOwnProperty('sha')) {
    // Updating the file entails repeating the above request with the `sha` parameter specified.
        return responseJson.content.sha;
    }
    return false;
}
