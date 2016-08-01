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
        'sheetId': 'xxxxxxxxx'
    };

/**
* Get `mapping.json` from the `master` branch of the repository.
* Note that `schema.json` is not necessary.
*
* @returns {Object} mappingJsonContents
*/
function getGitHubAsset(path) {
    var requestUrl = Utilities.formatString(
            'https://api.github.com/repos/%s/%s/contents/%s?ref=%s',
            github.username,
            github.repository,
            path,
            github.branch
        ),
        response = UrlFetchApp.fetch(requestUrl, {
            'method': 'GET',
            'headers': {
                'Accept': 'application/vnd.github.VERSION.raw',
                'Authorization': Utilities.formatString('token %s', github.accessToken)
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
*
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
*
* @param   {array}  columnFields - the name of each column for the sheet
* @param   {array} condiontalArray - an array of objects of conditions to be met
* @param   {array}  row - an array of the field values for that specific row
* @returns {boolean} whether the column in question includes the acceptable desired values
*/
function meetsAllConditionals(columnFields, conditionalArray, row) {
    var conds = [];
    if (conditionalArray && conditionalArray.length > 0) {
        conditionalArray.forEach(function (conditional) {
            var acceptable = meetsConditional(columnFields, conditional.acceptable_values, conditional.column_name, row);
            conds.push(acceptable);
        });
        var corrects = conds.reduce(getSum);
        if (corrects === conds.length || corrects === true) {
            return true;
        }
        return false;
    }
    return true;
}

/**
* Helper function for reduce to add sum to total
*
* @param   {integer} total - running total of the sum
* @param   {integer} num - next element to be added
* @returns {integer} sum of two params
*/
function getSum(total, num) {
  return total + num;
}

/**
* shim for if an array includes a particular object
*
* @param   {Array} arr - array to be searched
* @param   {Object} obj - object to see if exists
* @returns {Boolean} of if the object can be found in the array
*/
function include(arr, obj) {
  return (arr.indexOf(obj) !== -1);
}

/**
 * Convert the Google Sheet to JSON, per the mappings defined in `mapping.json`.
 *
 * @returns {Object} jsonData
 */
function generateJson() {
     var mappingJsonContents = getGitHubAsset('mapping.json'),
        responseObject = {},
        date = new Date();
    responseObject.meta = {};
    responseObject.meta.Created_At = date.toISOString();
    responseObject.meta.Produced_By = "General Services Administration";
    responseObject.data = {};

    mappingJsonContents.forEach(function (majorDataArray) {
      var gSheet = SpreadsheetApp.openById(gSheets.sheetId).getSheetByName(majorDataArray.from_sheet),
          sheetRows = gSheet.getSheetValues(2, 1, gSheet.getLastRow() - 1, gSheet.getLastColumn()),
          gSheetFields = gSheet.getRange(1, 1, 1, gSheet.getLastColumn()).getValues()[0]; // Get the first row of the spreadsheet (that is, the column names).

      responseObject.data[majorDataArray.object_name] = buildDataArray(sheetRows, gSheetFields, majorDataArray);
    });
    return JSON.stringify(responseObject, null, 2);
}

/**
* Build an array of data
*
* @param {array} sheetRows - an array of row field value arrays
* @param {array} columnNames - the column names for the spreadsheet
* @param {object} mappingsObj - all the objects and conditionals for each data array
*/
function buildDataArray(sheetRows, columnNames, mappingsObj) {
  var jsonData = [];
  sheetRows.forEach(function (row) {
      var acceptable_ATO = meetsAllConditionals(columnNames, mappingsObj.conditionals, row);
      if (acceptable_ATO) {
          jsonData.push(buildRowObject(row, columnNames, mappingsObj.fields));
      }
  });// Iterate once to generate all the Original ATOS

  //Iterate Again to handle All leveraged ATOS
  sheetRows.forEach(function (row) {
      buildInnerRow(row, columnNames, mappingsObj.fields, jsonData);
  }); // End iterate through subfields
  return jsonData;
}

/**
* Builds a row to be pushed into the resulting data object
*
* @param {Array} row - array of field values from the spreadsheet
* @param {Object} mappingFields - an object of the mappings from the row data to the exported jsonData
* @param {Array} gSheetFields - an array of field names (first column values) from the spreadsheet
* @returns {Object} an object of data to be pushed to the final json array
*/
function buildRowObject(row, gSheetFields, mappingFields){
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
*
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
                    var subfieldObj = buildRowObject(row, gSheetFields, mappingSubfields);
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
    github.accessToken = gitTokenGrab();
    var filename = 'data',
        jsonData = generateJson();
    DriveApp.createFile(filename, jsonData, MimeType.PLAIN_TEXT);
    var testDict = buildDataDictionary();
    DriveApp.createFile('testDataDictionary', testDict, MimeType.PLAIN_TEXT);
}

/**
* Grabs the last sha from the commited version of the data file on github
*
* @returns {String} the sha from the version of the data.json file on github for the master branch
*/
function getOldBlobSha(path) {
     var requestUrl = Utilities.formatString(
          'https://api.github.com/repos/%s/%s/contents/%s?ref=%s',
          github.username,
          github.repository,
          path,
          github.branch
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
* Grab and publish the data dictionary
*/
function buildDataDictionary() {
  //Grab dictionary mapping fields
  var mapping = getGitHubAsset('dictionary/mapping.json');
  //Grab dictionary Sheet
  var gSheet = SpreadsheetApp.openById(gSheets.sheetId).getSheetByName(mapping[0].from_sheet),
      sheetRows = gSheet.getSheetValues(4, 1, gSheet.getLastRow() - 1, gSheet.getLastColumn()),
      gSheetFields = gSheet.getRange(3, 1, 1, gSheet.getLastColumn()).getValues()[0];
  //Manipulate
  var dictionaryArray = [];
  sheetRows.forEach(function(row){
    var acceptable_ATO = meetsAllConditionals(gSheetFields, mapping[0].conditionals, row);
    if (acceptable_ATO) {
        dictionaryArray.push(buildRowObject(row, gSheetFields, mapping[0].fields));
    }
  });
  return JSON.stringify(dictionaryArray, null, 2);
}

/**
* Pushes to github an asset given the file, old sha, and url
* @param path - the location path in the gitrepo of the file to be published
* @param file - the actual data to be published
* @param lastSha - the sha of the previous file on gh
*/
function publishToGithub(path, file, lastSha){
  var requestUrl = Utilities.formatString(
      'https://api.github.com/repos/%s/%s/contents/%s',
      github.username,
      github.repository,
      path
  ),
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
          'content': Utilities.base64Encode(file),
          'sha': lastSha,
          'branch': github.branch
      })
  });
  var responseJson = JSON.parse(response.getContentText());

  if (responseJson.hasOwnProperty('content') && responseJson.content.hasOwnProperty('sha')) {
  // Updating the file entails repeating the above request with the `sha` parameter specified.
    return responseJson.content.sha;
  }
  return false;
}

/**
* Publish a JSON version of our Google Sheet to our repository.
* Please note that, at present, this will not overwrite an existing file with the same name.
*/
function run() {
    github.accessToken = gitTokenGrab();
    var path = 'data/data.json',
        jsonData = generateJson(),
        lastSha = getOldBlobSha(path), //Sha from the previous version of the data file, needed to update the script.
        newDataSha = publishToGithub(path, jsonData, lastSha);

    var dictPath = 'dictionary/dictionary.json',
        dictSha = getOldBlobSha(dictPath),
        dictData = buildDataDictionary(),
        newDictSha = publishToGithub(dictPath, dictData, dictSha);
}
