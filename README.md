# i2b2 Infobuttons
This plugin is a proof of concept showing the integration of infobuttons into i2b2.  After supplying the plugin with a patient set previously created in i2b2, the i2b2 Infobutton Plugin will return all of the chosen concepts (diagnoses, medications, etc.) for each patient.  Clicking on a concept will send an HL7-compliant request to OpenInfobutton, which will query known resources for the default institution (UAB in this case) and return a list of context-aware links in a new window.

## Installation
This package was built to be housed inside i2b2's standard plugin directory which is located at `/var/www/html/webclient/js-i2b2/cells/plugins/standard/` if it hasn't been changed.

1. Copy the files (can be done via one of two methods explained below) in this repository to your i2b2 instance's plugin directory (typically `/var/www/html/webclient/js-i2b2/cells/plugins/standard/`)
    1. (the hard way) Literally copy the files in this repository into a new directory created in the plugin directory
    2. (the easy way) Install git and clone this repository into the plugin directory

2. Add the following lines of code to the `i2b2.hive.tempCellsList = []` array in the file  `/var/www/html/webclient/js-i2b2/i2b2_loader.js` (note that the value of "code: " must be the same name as the directory housing the plugin)

    ```javascript
    { code: "i2b2-infobuttons",
      forceLoading: true,
      forceConfigMsg: { params: [] },
      forceDir: "cells/plugins/standard"
    },
    ```
    
    Remove the ending comma if it is the last item in the array.
3. Restart jBoss service or i2b2 server if necessary

## Customization
While the plugin should work immediately after proper installation, it will use a default organization for OpenInfobutton and default concept-selection settings in order to do so.  These can be changed as shown below.

### Adding your institution to the plugin
1. Add your institution to OpenInfobutton (this can be done following the instructions on [OpenInfobutton's Homepage](http://www.openinfobutton.org/) or through using [LITE](http://lite.bmi.utah.edu/))
2. In `InfoButton/InfoButton_ctrlr.js`, change `i2b2.InfoButton.OiInstitutionOid` to the value of your institution's OID (should reflect the setup in step 1)

### Adding to the default concepts
If you would like to have more concept types to choose from to be returned per patient, follow the steps below.

1. Locate the `i2b2.InfoButton.conceptMappings` object in `InfoButton/InfoButton_ctrlr.js`

    ```javascript
    i2b2.InfoButton.conceptMappings = {
        "Diagnosis": {
            "hlevel": "1",
            "itemKey":"\\\\i2b2_DIAG\\i2b2\\Diagnoses\\",
            "dimTablename": "concept_dimension",
            "dimDimcode": "\\i2b2\\Diagnoses\\",
            "itemIsSynonym": "N",
            "truncate": false
        },
        "Medications": {
            "hlevel": "1",
            "itemKey":"\\\\i2b2_MEDS\\i2b2\\Medications\\",
            "dimTablename": "concept_dimension",
            "dimDimcode": "\\i2b2\\Medications\\",
            "itemIsSynonym": "N",
            "truncate": true
        }
    };
    ```

2. Add a property of the object that will name the concepts (this is only used for display purposes)
3. Add the appropriate information in the following format (information can be found most easily in the PDO example plugin after submitting the desired concept):

    ```javascript
    i2b2.InfoButton.conceptMappings = {
        ...
        "newConcept": {
            "hlevel": "number",                         // Acquire from the PDO example plugin
            "itemKey":"\\\\i2b2\\format",               // Acquire from the PDO example plugin
            "dimTablename": "concept_dimension",        // This should be the same for all concepts
            "dimDimcode": "\\i2b2\\format\\",           // Acquire from the PDO example plugin
            "itemIsSynonym": "N",                       // This should be the same for all concepts
            "truncate": true                            // Set this to true if only the first word is needed for search
        }
    };
    ```
