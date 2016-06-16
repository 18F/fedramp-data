/**
 * Please configure these settings as necessary.
 *
 * This script uses a [personal access token](https://github.com/blog/1509-personal-api-tokens) for authentication, which I recommend.
 */
var github = {
  'username': '18F',
  'accessToken': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'repository': 'fedramp-micropurchase',
  'branch': 'master',
  'commitMessage': 'publish P-ATO data'
};
var gSheets = {
  'sheetId': '1JfIIBAI2W9l6qjN0MY1pncl6qcNG-3HndJGk9FUrACg',
  'sheetName': 'New ATO PATO Log'
};

/**
 * Get `mapping.json` from the `master` branch of the repository.
 * Note that `schema.json` is not necessary.
 *
 * @returns {Object} mappingJsonContents
 */
function getMappingsFromGitHub() {
  var path = 'mapping.json';

  var requestUrl = Utilities.formatString(
    'https://api.github.com/repos/%s/%s/contents/%s',
    github['username'],
    github['repository'],
    path
  );

  var response = UrlFetchApp.fetch(requestUrl, {
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
  switch(fieldType) {
    case 'String':
    case 'UTCString':
      return fieldValue;
      break;

    case 'Array':
      return fieldValue.split('&');
      break;
  }
}

/**
 * Convert the Google Sheet to JSON, per the mappings defined in `mapping.json`.
 *
 * @returns {Object} jsonData
 */
 function meetsConditional(columnFields, desiredValue, columnName, row){
   var columnNameIndex = columnFields.indexOf(columnName);
   if( include(desiredValue, row[columnNameIndex])){
     return true;
   } else {
     return false;
   }
 }
 function include(arr,obj) {
     return (arr.indexOf(obj) != -1);
 }

 function generateJson() {
   var mappingJsonContents = getMappingsFromGitHub();
   var mappingFields = mappingJsonContents['fields'];

   var gSheet = SpreadsheetApp.openById(gSheets.sheetId).getSheetByName(gSheets.sheetName);
   // Get the first row of the spreadsheet (that is, the column names).
   var gSheetFields = gSheet.getRange(1, 1, 1, gSheet.getLastColumn()).getValues()[0];

   var jsonData = [];

   // If the spreadsheet lacks a field corresponding to the `from_field` key, then skip it, save for the `ATO_Letters` field.
   // mappingFields = mappingFields.filter(function(mappingField) {
   //   return (gSheetFields.indexOf(mappingField['from_field']) !== -1) || (mappingField['name'] === 'ATO_Letters');
   // });



   // For each row of our spreadsheet, create a JavaScript object.
   var sheetRows = gSheet.getSheetValues(2, 1, gSheet.getLastRow() - 1, gSheet.getLastColumn());
   sheetRows.forEach(function(row) {
     var original_ATO = meetsConditional(gSheetFields, mappingJsonContents['conditionals'][0]['acceptable_values'], mappingJsonContents['conditionals'][0]['column_name'], row);
     if(original_ATO){
       var jsonRow = {};
       mappingFields.forEach(function(mappingField) {
         var mappingFieldIndex = gSheetFields.indexOf(mappingField['from_field']);
         var mappingFieldValue = row[mappingFieldIndex];

         // If the field has a value, then parse it according to its type and store it in our row object.
         if(mappingFieldValue) {
           jsonRow[mappingField['name']] = parseField(mappingFieldValue, mappingField['type']);
         }

         // If the field contains subfields create the array to handle leveraged ATOS.
         if(mappingField.hasOwnProperty('subfields')) {
           jsonRow[mappingField['name']] = [];
         }
       });
       jsonData.push(jsonRow);
     } // Iterate once to generate all the Original ATOS
   });
     //Iterate Again to handle All leveraged ATOS
     sheetRows.forEach(function(row){
       mappingFields.forEach(function(mappingField) {
         if(mappingField.hasOwnProperty('subfields')) {
           //Lookup in JsonData if row has the same value as key
           var leveraged_ATO = meetsConditional(gSheetFields, mappingField['conditionals'][0]['acceptable_values'], mappingField['conditionals'][0]['column_name'], row);
           if(leveraged_ATO){
           var mappingSubfields = mappingField['subfields'];
           var keyIndex = gSheetFields.indexOf(mappingField['from_key_value']);

           jsonData.forEach(function(ATORow, jsonIndex){
             if(ATORow[mappingField['key']]==row[keyIndex]){
               //Push the subfields
               var subfieldObj = {}
               mappingSubfields.forEach(function(mappingSubfield) {
                 var mappingSubfieldIndex = gSheetFields.indexOf(mappingSubfield['from_field']);
                 var mappingSubfieldValue = row[mappingSubfieldIndex];

                 if(mappingSubfieldValue) {
                   // jsonRow[mappingField['name']][0][mappingSubfield['name']] = parseField(mappingSubfieldValue, mappingSubfield['type']);
                   subfieldObj[mappingSubfield['name']] = parseField(mappingSubfieldValue, mappingSubfield['type']);
                 } //End push subfield
               });
               jsonData[jsonIndex][mappingField['name']].push(subfieldObj);
             }
           });


         }
       }
     });
   }); // End iterate through subfields
   // });

   return JSON.stringify(jsonData, null, 2);
 }

/**
 * Publish a JSON version of our Google Sheet to our repository.
 * Please note that, at present, this will not overwrite an existing file with the same name.
 */
function publishToGitHub() {
  var path = Utilities.formatString('data/%s.json', Utilities.formatDate(new Date(), 'UTC', 'MM-dd-yyyy'));
  var jsonData = generateJson();

  var requestUrl = Utilities.formatString(
    'https://api.github.com/repos/%s/%s/contents/%s',
    github['username'],
    github['repository'],
    path
  );

  var response = UrlFetchApp.fetch(requestUrl, {
    'method': 'PUT',
    'headers': {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Authorization': Utilities.formatString('token %s', github['accessToken'])
    },
    'payload': JSON.stringify({
      'path': path,
      'message': github['commitMessage'],
      'content': Utilities.base64Encode(jsonData),
      'branch': github['branch']
    })
  });

  var responseJson = JSON.parse(response.getContentText());

  if(responseJson.hasOwnProperty('content') && responseJson['content'].hasOwnProperty('sha')) {
    // Updating the file entails repeating the above request with the `sha` parameter specified.
    return responseJson['content']['sha'];
  } else {
    return false;
  }
}
