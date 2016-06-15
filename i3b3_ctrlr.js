/**
 * This file is a part of the I2B2 i3b3Plugin
 * Copyright (C) 2015  Tim Kennell Jr. and James Cimino, MD
 * i3b3 integrates infobuttons into i2b2 through a plugin
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses/>.
 **
 * Controller for SDX Data passed through i3b3 Plugin
 **/

/**
 * i2b2.i3b3.Init
 *
 * Loads plugin div into viewer
 */
i2b2.i3b3.Init = function(loadedDiv) {
    i2b2.i3b3.view.containerDiv = loadedDiv;

    // Manage YUI
    var cfgObj = {activeIndex: 0};
    this.yuiTabs = new YAHOO.widget.TabView("i3b3-TABS", cfgObj);

    // Initialize variables to be used and prevent collision when first using
    i2b2.i3b3.model.prsRec = null;
    i2b2.i3b3.model.cncptRec = null;
    i2b2.i3b3.model.errors = "";

    // Variable storing default concept selection by user, set to Diagnosis for default
    i2b2.i3b3.model.defaultConcept = "Diagnosis";

    // Register datatypes capable of being dropped onto drop-target div
    var op_target = {dropTarget: true};
    i2b2.sdx.Master.AttachType("concept-drop", "CONCPT", op_target);
    i2b2.sdx.Master.AttachType("patient-set-drop", "PRS", op_target);

    // Register drop event handler function with drop-target div
    i2b2.sdx.Master.setHandlerCustom("concept-drop", "CONCPT", "DropHandler", i2b2.i3b3.cncptDrop);
    i2b2.sdx.Master.setHandlerCustom("patient-set-drop", "PRS", "DropHandler", i2b2.i3b3.prsDrop);

    // Create high level concept radio buttons
    i2b2.i3b3.createConceptRadioButtons();

    // Attach click event to radio buttons
    $$(".default-concepts")[0].addEventListener("click", function(e) {
        if (e.target !== e.currentTarget) {
            
            // Get radio button value and set to i2b2.i3b3.model.defaultConcept global variable
            i2b2.i3b3.getConceptRadioButtonValue();

            // If user selected "Choose my own" radio button, show the option to choose their own concept
            if (i2b2.i3b3.model.defaultConcept === "choose") {
                $("concept-drop-group").show();
                // Don't run the i2b2.i3b3.getPdoList() function as we need to wait for concept-drop

            // User has chosen on of the defaults, run with it
            } else {
                $("concept-drop-group").hide();
                i2b2.i3b3.getPdoList(i2b2.i3b3.displayPatientList);    // Display results
            }
        }

        // prevent excessive bubbling
        e.stopPropagation();
    }, false);
};

/**
 * i2b2.i3b3.Unload
 *
 * Unloads plugin when selecting another plugin
 */
i2b2.i3b3.Unload = function() {
    i2b2.i3b3.model.cncptRec = null;
    i2b2.i3b3.model.prsRec = null;
    i2b2.i3b3.model.defaultConcept = "";
    i2b2.i3b3.model.errors = "";
    i2b2.i3b3.model.dirtyResultsData = true;

    return true;    // Allow plugin to unload without question
};

/**
 * i2b2.i3b3.conceptMappings
 * 
 * JSON object of default concepts to be added as radiobuttons above drag and drop
 * Addition of default concepts can be easily done by adding more elements to the array
 * Use of PDO example plugin with desired concept will give necessary parameters in <filter_list> under "View Results" tab
 * Set "truncate" to "true" if first word of the concept is all that is needed
 */
i2b2.i3b3.conceptMappings = {
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

/**
 * i2b2.i3b3.OiInstitutionOid
 * 
 * Used in the link to Openi3b3 for retrieval of context specific information
 * Change this to organization where the plugin is installed to take advantage of
 * institution specific resources
 * The current institution is an example institution with some default resources
 */
i2b2.i3b3.OiInstitutionOid = "1.3.6.1.4.1.7341";

/**
 * i2b2.i3b3.createRadioButtons
 * 
 * Creates UI radio buttons that will contain default concepts to be selected
 * Dependencies
 * - i2b2.i3b3.conceptMappings
 */
i2b2.i3b3.createConceptRadioButtons = function() {
    var display = "";

    // Go through i2b2.i3b3.conceptMappings (default concepts) and create
    // radiobutton for each
    for (concept in i2b2.i3b3.conceptMappings) {
        display += "<label>"
        display += "<input type=\"radio\" name=\"default-concepts\" value=\"" + concept + "\"";

        if (concept === "Diagnosis") {
            display += " checked=\"checked\" ";
        }

        display += ">" + concept;
        display += "</label>";
    }

    // Display choice to choose own
    display += "<label>";
    display += "<input type=\"radio\" name=\"default-concepts\" value=\"choose\"> Choose my own";
    display += "</label>";

    $$(".default-concepts")[0].innerHTML = display;
};

/**
 * i2b2.i3b3.getConceptRadioButtonValue
 * 
 * Sets i2b2.i3b3.model.defaultConcept equal to user selected radiobutton for
 * default concept to use on patient set
 * Dependencies
 * - i2b2.i3b3.createConceptRadioButtons: needed to create radiobuttons
 */
i2b2.i3b3.getConceptRadioButtonValue = function() {
    i2b2.i3b3.model.defaultConcept = $$("input[name=default-concepts]:checked")[0].value;
    i2b2.i3b3.cncptDelete();

    // Data is only allowed to rerun if a patient set is already loaded
    if (i2b2.i3b3.model.prsRec) {
        i2b2.i3b3.model.dirtyResultsData = true;
    }
};

/**
 * i2b2.i3b3.prsDrop
 *
 * Function handles drop event:
 * - Accepts argument containing patient set sdxData
 * - Loads data from sdx into current plugin model
 * - Visualy shows user drop was successful
 */
i2b2.i3b3.prsDrop = function(sdxData) {
    sdxData = sdxData[0];                             // Only pull first record
    i2b2.i3b3.model.prsRec = sdxData;

    // Change the color and text of div for dropping upon success for user verification
    $("patient-set-drop").innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);
    $("patient-set-drop").style.background = "#CFB";
    setTimeout("$('patient-set-drop').style.background = '#DEEBEF'", 250); 

    // This will only fail if a user has chosen "Choose my own" and has not submitted a cncptRec
    // This way, data won't run if user chooses "Choose my own", drops a patient set, but not a concept
    if (i2b2.i3b3.model.defaultConcept !== "choose" || i2b2.i3b3.model.cncptRec) {
        i2b2.i3b3.model.dirtyResultsData = true;    // Refresh flag for new data

        // Acquire patient list and display results
        i2b2.i3b3.getPdoList(i2b2.i3b3.displayPatientList);

    // notify user that they still need a concept
    } else {
        $$(".results-error")[0].innerHTML = "Please submit a concept as well";
        $$(".results-error")[0].show();
    }
};

/**
 * i2b2.i3b3.cncptDrop
 *
 * Function handles drop event:
 * - Accepts argument containing concept sdxData
 * - Loads data from sdx into current plugin model
 * - Visually shows user drop was successful
 */
i2b2.i3b3.cncptDrop = function(sdxData) {
    sdxData = sdxData[0];                             // Only pull first record (maybe need to pull more?)
    i2b2.i3b3.model.cncptRec = sdxData;

    // Change drop-target-ui div upon success for user verification
    $("concept-drop").innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);
    $("concept-drop").style.background = "#CFB";
    setTimeout("$('concept-drop').style.background = '#DEEBEF'", 250); 

    // Don't need default concept since the dropped concept will take its place
    // Allows i2b2.i3b3.createPdoFilter() to work
    i2b2.i3b3.model.defaultConcept = null;

    // Don't make the results dirty unless a patient set has been dropped
    // A patient set it required to make the whole system work
    if (i2b2.i3b3.model.prsRec) {
        i2b2.i3b3.model.dirtyResultsData = true;    // Refresh flag for new data
    }

    // Display results
    i2b2.i3b3.getPdoList(i2b2.i3b3.displayPatientList);
};

/**
 * i2b2.i3b3.cncptDelete
 * 
 * Function removes concept's sdxData from model and user view
 * Dependencies
 * - i2b2.i3b3.model.cncptRec
 */
i2b2.i3b3.cncptDelete = function() {
    if (i2b2.i3b3.model.cncptRec !== null) {
        i2b2.i3b3.model.cncptRec = null;
        $("concept-drop").innerHTML = "Drop Here";
    }
};

/**
 * i2b2.i3b3.cellQueryError
 * 
 * Error handling function for callbacks since multiple cell queries will be made
 * Takes a result object from i2b2 callback
 */
i2b2.i3b3.cellQueryError = function(queryResult) {
    if (queryResult.error) {
        $$(".results-error").innerHTML = "<p style=\"color: red;\"><strong>Warning: the request has errored out and the server is unable to complete the request. Press F12 for more information.</strong></p>";
        
        // Get rid of all processing and result message and just display errors
        $$(".results-retrieving-patient-list")[0].hide();
        $$(".results-retrieving-patient-concepts")[0].hide();
        $$(".results-finished")[0].hide();
        $$(".results-error")[0].show();

        console.error("Error response from server: " + queryResult);
        return true;
    }

    return false;
};

/**
 * i2b2.i3b3.cncptPdoXmlToJson
 * 
 * Changes a dropped concept's XML DOM (not XML string) data to the same format as 
 * the json object i2b2.i3b3.conceptMappings
 */
i2b2.i3b3.cncptPdoXmlToJson = function(xmlData) {
    xmlData = xmlData.origData.xmlOrig;
    var jsonData = {};
    jsonData.hlevel = i2b2.h.getXNodeVal(xmlData, "level");
    jsonData.itemKey = i2b2.h.getXNodeVal(xmlData, "key");
    jsonData.dimTablename = i2b2.h.getXNodeVal(xmlData, "tablename");
    jsonData.dimDimcode = i2b2.h.getXNodeVal(xmlData, "dimcode");
    jsonData.itemIsSynonym = i2b2.h.getXNodeVal(xmlData, "synonym_cd");

    return jsonData;
};

/**
 * i2b2.i3b3.createPdoFilter
 * 
 * Creates filter for the PDO request
 * NOTE: This function performs its job independent of user input, will accept dropped
 *       concept or concept from radiobutton selection
 *
 * Dependencies
 * - i2b2.i3b3.model.cncptRec
 * - i2b2.i3b3.model.conceptMappings
 * - i2b2.i3b3.model.cncptPdoXmltoJson()
 */
i2b2.i3b3.createPdoFilter = function() {
    // If concept dropped (i2b2.i3b3.model.defaultConcept not null) use dropped concept, else use radiobutton concept
    var cncptData = i2b2.i3b3.model.defaultConcept 
                        ? i2b2.i3b3.conceptMappings[i2b2.i3b3.model.defaultConcept]
                        : i2b2.i3b3.cncptPdoXmlToJson(i2b2.i3b3.model.cncptRec);
    
    // Create message filter for PDO request to retrieve patients and concepts
    var messageFilter = 
            "            <input_list>\n" +
            "              <patient_list max=\"9999\" min=\"1\">\n" +
            "                <patient_set_coll_id>" + i2b2.i3b3.model.prsRec.sdxInfo.sdxKeyValue + "</patient_set_coll_id>\n" +
            "              </patient_list>\n" +
            "            </input_list>\n" +
            "            <filter_list>\n" +
            "              <panel name=\"" + cncptData.itemKey + "\">\n" +
            "                <panel_number>0</panel_number>\n" +
            "                <panel_accuracy_scale>0</panel_accuracy_scale>\n" +
            "                <invert>0</invert>\n" +
            "                <item>\n" +
            "                  <hlevel>" + cncptData.hlevel + "</hlevel>\n" +
            "                  <item_key>" + cncptData.itemKey + "</item_key>\n" +
            "                  <dim_tablename>" + cncptData.dimTablename + "</dim_tablename>\n" +
            "                  <dim_dimcode>" + cncptData.dimDimcode + "</dim_dimcode>\n" +
            "                  <item_is_synonym>" + cncptData.itemIsSynonym + "</item_is_synonym>\n" + 
            "                </item>\n" +
            "              </panel>\n" +
            "            </filter_list>\n" +
            "            <output_option names=\"asattributes\">\n" +
            "              <patient_set select=\"using_input_list\" onlykeys=\"false\" />\n" +
            "              <observation_set blob=\"false\" onlykeys=\"false\" selectionfilter=\"single_observation\" />\n" +
            "            </output_option>";

            return messageFilter;
};

/**
 * i2b2.i3b3.getPdoList
 * 
 * Aggregates submitted data and places patient list in i2b2.i3b3.model.patientList as an XML object
 * This is manipulated later for formatting purpose
 *
 * NOTE: listed patients should be hrefs that should trigger getPopup function "onclick"
 * NOTE: this function is placed under every event that needs to trigger a new list 
 *       (i.e. whenever  the user changes the data input); however, due to i2b2's event
 *       handling, there doesn't appear to be a better way to do this
 * 
 * Dependencies
 * - i2b2.i3b3.model.dirtyResultsData
 * - i2b2.i3b3.cellQueryError()
 * - i2b2.i3b3.createPdoFilter()
 */
i2b2.i3b3.getPdoList = function(displayCb) {
    // If criteria have been met to run data (i2b2.i3b3.model.dirtyResultsData == true)
    if (i2b2.i3b3.model.dirtyResultsData) {
        var scopedCallback = new i2b2_scopedCallback();
        scopedCallback.scope = this;
        scopedCallback.callback = function(results) {
            // check for errors
            if (i2b2.i3b3.cellQueryError(results)) {
                return false;
            }
    
            // Remove processing display and show results
            $$(".results-retrieving-patient-list")[0].hide();
            $$(".results-retrieving-patient-concepts")[0].hide();


            // store XML object in global variable for later use
            i2b2.i3b3.model.patientList = results.refXML;
            
            // Takes function for displaying
            displayCb(results.refXML);    // callback prevents execution till asynchronous scopedCallback is done
            i2b2.i3b3.model.dirtyResultsData = false;

            // For debugging:  shows XML response instead of pretty UI
            // $$(".results-finished")[0].innerHTML = '<pre>'+i2b2.h.Escape(results.msgResponse)+'</pre>';
        }

        // Remove any errors and display initial patient list processing message and remove concept processing message
        // Element.select(divResults, '.InfoPDO-Response .originalXML')[0].innerHTML = '<pre>'+i2b2.h.Escape(results.msgResponse)+'</pre>';

        // TODO: move above scoped callback code for better logical flow
        $$(".results-error")[0].hide();
        $$(".results-retrieving-patient-list")[0].show();
        $$(".results-retrieving-patient-concepts")[0].hide();

        // AJAX call using the existing crc cell communicator
        var msg_vals = {
            PDO_Request: i2b2.i3b3.createPdoFilter()
        };

        i2b2.CRC.ajax.getPDO_fromInputList("Plugin:i3b3", msg_vals, scopedCallback);
    }
};

/**
 * i2b2.i3b3.dipslayPatientList
 * 
 * Does the actual display of the patient list and related Dx as appropriate
 * Tests for presence of droppedConcept to determine what type of list to return for display
 * Expects a JavaScript XML object for the patientXmlObject
 */
i2b2.i3b3.displayPatientList = function(patientXmlObject) {
    // Acquire patients from XML
    var patientList = patientXmlObject.getElementsByTagName("patient");

    // Intialize unordered list
    var display = "<ul class=\"patient-list\">";

    // Go through each patient for displaying information
    for (var i = 0; i < patientList.length; i++) {
        var patient = i2b2.i3b3.patientXmlToJson(patientList[i]);    // XML --> JSON for easier processing
        if(patient.error) {                                                // an error has occurred while building the object
            display += "<li>" + patient.errorMessage + "</li>";            // display error message
        
        // Everything is working, display list
        } else {
            var patientDisplayInfo = patient.id + " (" + patient.age_in_years_num + " y/o " + patient.sex_cd + ")";

            // User has chosen their own concept, just make patient list out of hyperlinks that 
            // directly communicate with Openi3b3 based on user's chosen concept
            if (i2b2.i3b3.model.cncptRec) {   // user has dropped cncpt in ui
                var cncptName = i2b2.h.getXNodeVal(i2b2.i3b3.model.cncptRec.origData.xmlOrig, "name").toLowerCase().replace(/ /gi, "%20");    // get name of cncpt and then lower case all words and replace spaces with http symbol for use in oi url
                display += "<li>" + patientDisplayInfo + "<a href=\"#\" onClick=\"i2b2.i3b3.getPopupUrl('" + cncptName + "', '" + patient.age_in_years_num + "', '" + patient.sex_cd + "')\"><img class=\"infobutton-icon\" src=\"js-i2b2/cells/plugins/standard/i3b3/assets/infobutton32x32.png\" alt=\"infobutton\" /></a></li>";
            
            // user went with one of the default concepts (radiobutton concepts)
            } else {
                display += "<li>" + patientDisplayInfo;

                // sets up ul below each patient for putting appropriate concepts below each patient
                display += "<ul id=\"" + patient.id + "\">";
                display += "</ul>";
                display += "</li>";
            }
        }
    }

    display += "</ul>";

    $$(".results-finished")[0].innerHTML = display;

    $$(".results-retrieving-patient-list")[0].hide();

    // Don't need to print out extra processing message if no data to do anything
    // Note that dropping a concept sets i2b2.i3b3.model.defaultConcept to 
    // null so that i2b2.i3b3.createPdoFilter() works
    if (i2b2.i3b3.model.defaultConcept !== null) {
        $$(".results-retrieving-patient-concepts")[0].show();
    }

    $$(".results-finished")[0].show();

    // call function to display concepts only if user requested concepts
    // i2b2.i3b3.model.cncptRec will not be filled
    if (!i2b2.i3b3.model.cncptRec) {
        i2b2.i3b3.displayConcepts(patientXmlObject);
    }
};


/**
 * i2b2.i3b3.displayConcepts
 * 
 * Displays concepts below each patient if user has selected a default concept
 */
i2b2.i3b3.displayConcepts = function(patientXmlObject) {
    // prep display variable
    var display = "";

    // Grab all observations from patientXmlObject received from getPdoList()
    var observationList = patientXmlObject.getElementsByTagName("observation");
    
    // Go through each observation
    for (var i = 0; i < observationList.length; i++) {
        // Translate XML to JSON (much better data type...)
        var observation = i2b2.i3b3.observationXmlToJson(observationList[i]);

        if (!observation.error) {
            // Set up XPath to get patient node with patient_id given by observation.patient_id (patient ID of current observation)
            var path = "/*[local-name()='response']/message_body/*[local-name()='response']/*[local-name()='patient_data']/*[local-name()='patient_set']/patient[patient_id='" + observation.patient_id + "']";
            if (window.ActiveXObject) {
                patientXmlObject.setProperty("SelectionLanguage", "XPath");
                var patientNode = patientXmlObject.selectNodes(path);
            } else if (document.implementation && document.implementation.createDocument) {
                var xpathResult = patientXmlObject.evaluate(path, patientXmlObject, null, XPathResult.ANY_TYPE, null);
                var patientNode = xpathResult.iterateNext();
            }

            // Translate patient XML to JSON
            var patient = i2b2.i3b3.patientXmlToJson(patientNode);

            // Truncate concept to first word if information set to do so and change concept to http friendly form and 
            var cncptName = i2b2.i3b3.conceptMappings[i2b2.i3b3.model.defaultConcept].truncate ? 
                                observation.concept_cd_name.split(" ")[0].toLowerCase().replace(/ /gi, "%20") :
                                observation.concept_cd_name.toLowerCase().replace(/ /gi, "%20");

            // Select appropriate <ul> element and place into i2b2.i3b3.translateConceptCode()
            var displayElement = document.getElementById(observation.patient_id);
            displayElement.innerHTML += "<li>" + observation.concept_cd_name + " (" + observation.patient_id + "; " + observation.event_id + "; " + observation.concept_cd + "; " + observation.start_date + "; " + observation.end_date + "; " + observation.modifier_cd + "; " + observation.instance_num + ") " + "<a href=\"#\" onClick=\"i2b2.i3b3.getPopupUrl('" + cncptName + "', '" + patient.age_in_years_num + "', '" + patient.sex_cd + "')\"><img class=\"infobutton-icon\" src=\"js-i2b2/cells/plugins/standard/i3b3/assets/infobutton32x32.png\" alt=\"infobutton\" /></a></li>";
        }
    }

    $$(".results-retrieving-patient-concepts")[0].hide();
};


/**
 * i2b2.i3b3.getPopupUrl
 *
 * Creates the Url for the popup and calls the window
 */
i2b2.i3b3.getPopupUrl = function(cncpt, patientAge, patientSex) {
    window.open("http://dev-service.oib.utah.edu:8080/infobutton-service/infoRequest?representedOrganization.id.root=" + i2b2.i3b3.OiInstitutionOid + "&taskContext.c.c=OE&mainSearchCriteria.v.dn=" + cncpt + "&patientPerson.administrativeGenderCode.c=" + patientSex + "&age.v.v=" + patientAge + "&age.v.u=a&informationRecipient=PAT&informationRecipient.languageCode.c=en&executionMode=TEST", "Test", "width=1200, height=800");
};

/**
 * i2b2.i3b3.patientXmlToJson
 * 
 * Changes XML data in patient tag returned by i2b2.i3b3.getPdoList() into
 *     an easy to use JavaScript object using param tag column attribute as propery 
 *     name and param tag value as propery value (format below)
 *     <param type="string" column="sex_cd">M</param> --> patientObject.sex_cd = "M"
 * NOTE:  This also cleans up the data and puts things in HL7 standards
 * NOTE:  This will only accept one patient at a time
 */
i2b2.i3b3.patientXmlToJson = function(patient) {
    var patientObject = {};

    // because OI requires certain parameters to make the request
    var requiredPatientParams = ["sex_cd", "age_in_years_num"];
    
    // Make sure that the patient object provided is filled in the first place
    if (patient.firstChild == null) {
        patientObject.error = true;
        patientObject.errorMessage = "No patient has been provided or the patient is not in an XML object format";
        return false;    // A fatal error has occurred and there is no patientObject to return
    
    // Patient object is correctly filled
    } else {
        patientObject.id = patient.getElementsByTagName("patient_id")[0].firstChild != null ? patient.getElementsByTagName("patient_id")[0].firstChild.nodeValue : "ID-less Patient";
        var patientInfo = patient.getElementsByTagName("param");
        
        // Going through each parameter
        for (var i = 0; i < patientInfo.length; i++) {
            // Error check for null nodes
            if (patientInfo[i].firstChild != null) {

                // Force HL7 standard on sex
                if (patientInfo[i].getAttribute("column") == "sex_cd") {
                    patientObject[patientInfo[i].getAttribute("column")] = i2b2.i3b3.forceHl7SexCode(patientInfo[i].firstChild.nodeValue);
                } else {
                    patientObject[patientInfo[i].getAttribute("column")] = patientInfo[i].firstChild.nodeValue;
                }
            } else {
                patientObject[patientInfo[i].getAttribute("column")] = "nobody here but us chickens";
            }
        }

        // Creating error message
        for (var i = 0; i < requiredPatientParams.length; i++) {
            if (patientObject[requiredPatientParams[i]] == "nobody here but us chickens" || patientObject[requiredPatientParams[i]] == undefined) {
                patientObject.error = true;
                if (!patientObject.errorMessage) {    // if this is the first error
                    patientObject.errorMessage = "The following required parameters were missing from the patient: " + requiredPatientParams[i];
                } else {
                    patientObject.errorMessage += ", " + requiredPatientParams[i];
                }
            }
        }

        // if there are no errors in the above loop
        if (!patientObject.error) {
            patientObject.error = false;
            patientObject.errorMessage = "You shouldn't be seeing this. If you are, there is an error in the code";
        }
    }
    // default values
    return patientObject;    // a nice clean object returned from this function
};

/**
 * i2b2.i3b3.forceHl7SexCode
 * 
 * Forces any method of denoting sex to be forced into HL7 standard
 */
i2b2.i3b3.forceHl7SexCode = function(sexCode) {
    if (sexCode.length > 1) {
        return sexCode[0].toUpperCase();
    } else {
        return sexCode[0].toUpperCase();
    }
};

/**
 * i2b2.i3b3.observationXmlToJson
 * 
 * Similar to i2b2.i3b3.patientXmlToJson: changes observation XML --> JSON
 * Only pulls what is needed in this case, though (patient_id and concept_cd)
 */
i2b2.i3b3.observationXmlToJson = function(observation) {
    var observationObject = {};
    var requiredObservationParams = ["patient_id", "concept_cd", "start_date", "end_date", "modifier_cd", "instance_num", "event_id"];    // These tags in each observation can't be null

    if (observation.firstChild == null) {
        observationObject.error = true;
        observationObject.errorMessage = "There are no concepts associated with this patient or the concepts are not in an XML object format";
        return false;    // fatal error has occurred and no data is available for processing
    } else {
        for (var i = 0; i < requiredObservationParams.length; i++) {

            // There should only be one of the required parameters
            var observationParamTag = observation.getElementsByTagName(requiredObservationParams[i])[0];
            var observationParamChild = observationParamTag.firstChild;
            if (observationParamChild == null) {
                observationObject.error = true;
                if (!observationObject.errorMessage) {    // if this is the first error
                    observationObject.errorMessage = "The following required parameters were missing from the diagnostic criteria: " + requiredObservationParams[i];
                } else {
                    observationObject.errorMessage += ", " + requiredObservationParams[i];
                }
            } else {
                observationObject[requiredObservationParams[i]] = observationParamChild.nodeValue;
                if (observationParamTag.getAttribute("name") !== null) {
                    observationObject[requiredObservationParams[i] + "_name"] = observationParamTag.getAttribute("name");
                }
            }
        }

        if (!observationObject.error) {
            observationObject.error = false;
            observationObject.errorMessage = "You shouldn't be seeing this. If you are, there is an error in the code";
        }
    }
    return observationObject;
};