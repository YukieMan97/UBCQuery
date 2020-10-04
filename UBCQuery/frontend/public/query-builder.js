/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
const courseColumns = ["audit", "avg", "dept", "fail", "id", "instructor", "pass", "title", "uuid", "year"];
const roomColumns = ["address", "fullname", "furniture", "href", "lat", "lon", "name", "number", "seats", "shortname", "type"];
let formElement;

CampusExplorer.buildQuery = function () {
    let query = {};
    formElement = null;
    let kind = document.getElementsByClassName("nav-item tab active")[0].innerHTML.toLowerCase();
    const columnToUse = kind === "courses" ? courseColumns : roomColumns;

    let allChecked = document.getElementById(kind + "-conditiontype-all").checked;
    let anyChecked = document.getElementById(kind + "-conditiontype-any").checked;
    let noneChecked = document.getElementById(kind + "-conditiontype-none").checked;

    formElement = Array.from(document.getElementsByTagName("form")).find(function (form) {
        let dataType = form.getAttribute("data-type");
        return dataType === kind;
    });
    //Lets get the conditions in the query first
    query["WHERE"] = {};
    let allTheConditionsArray = document.getElementById("tab-"+ kind).getElementsByClassName("control-group condition");
    let conditionsArray = getTheConditionsArray(allTheConditionsArray, kind);
    if (conditionsArray.length === 0 ) {
        query["WHERE"] = {};
    }
    else if(conditionsArray.length === 1) {
        if(noneChecked) {
            query["WHERE"]["NOT"] = conditionsArray[0];
        }
        else {
            query["WHERE"] = conditionsArray[0];
        }
    }
    else {
        if(noneChecked) {
            query["WHERE"]["NOT"] = conditionsArray[0];
        }
        if(allChecked) {
            query["WHERE"]["AND"] = conditionsArray;
        }
        else {
            query["WHERE"]["OR"] = conditionsArray;
        }
    }
    // Now lets get the options done
    let checkedColumns = getTheCheckedColumnsOrGroups(kind, "columns");
    Array.from(formElement.getElementsByClassName("control transformation")).forEach(function (elm) {
        if (elm.firstElementChild.checked) {
            checkedColumns.push(elm.innerText.trim());
        }
    });
    query["OPTIONS"] = {};
    query["OPTIONS"]["COLUMNS"] = checkedColumns;
    let order = getOrder(kind);
    if (order) {
        query["OPTIONS"]["ORDER"] = order;
    }
    // Now lets get the transformations done
    let checkedGroups = getTheCheckedColumnsOrGroups(kind, "groups");
    let applyKeys = getApplyKeys(kind);
    if (checkedGroups.length !== 0 && applyKeys.length !== 0) {
        query["TRANSFORMATIONS"] = {};
        query.TRANSFORMATIONS["GROUP"] = checkedGroups;
        query.TRANSFORMATIONS["APPLY"] = applyKeys;
    }
    return query;
};

let getApplyKeys = function (kind) {
    let transformationToUse = document.getElementsByClassName("transformations-container")[0];
    if (kind === "rooms") {
        transformationToUse = document.getElementsByClassName("transformations-container")[1];
    }
    let applyRulesArray = [];

    Array.from(transformationToUse.getElementsByClassName("control-group transformation")).forEach (function (applyRuleElement) {
        let applyKey = applyRuleElement.getElementsByClassName("control term")[0].firstElementChild.value;
        let applyToken = Array.from(applyRuleElement.getElementsByClassName("control operators")[0].firstElementChild.
        getElementsByTagName("option")).find (function (controlOperator) {
            return controlOperator.selected;
        }).value;
        let keyType = Array.from(applyRuleElement.getElementsByClassName("control fields")[0].firstElementChild.
        getElementsByTagName("option")).find( function (controlField) {
            return controlField.selected;
        }).value;
        let applyObject = {};
        applyObject[applyKey] = {};
        applyObject[applyKey][applyToken] = kind + "_" + keyType;
        applyRulesArray.push(applyObject);
    });
    return applyRulesArray;
};

let getOrder = function (kind) {
    let order = {
        dir: "UP",
        keys: []
    };
    Array.from(document.getElementById("tab-"+ kind).getElementsByClassName("control order fields")).forEach (function (obj) {
        let selectedSections = Array.from(obj.getElementsByTagName("option")).filter(function (elm) {
            return elm.selected;
        });
        selectedSections.forEach(function (orderBy) {
            if(roomColumns.includes(orderBy.value) || courseColumns.includes(orderBy.value)) {
                order.keys.push(kind + "_" + orderBy.value);
            }
            else {
                order.keys.push(orderBy.value);
            }
        });
    });
    if (document.getElementById(kind + "-order").checked) {
        order.dir = "DOWN";
    }
    if (order.keys.length === 1 && order.dir === "UP") {
        order = order.keys[0];
    }
    if(typeof order === "string") {
        return order;
    }
    if(order.keys.length === 0) {
        order = null;
    }
    return order;
};

let getTheCheckedColumnsOrGroups = function (kind, type) {
    let returnColumnsGroupArray = [];
    if(kind === "courses") {
        for (let course of courseColumns) {
            if (document.getElementById(kind + "-" + type + "-field-" + course).checked) {
                returnColumnsGroupArray.push(kind + "_" + course);
            }
        }
    }
    else {
        for (let room of roomColumns) {
            if (document.getElementById(kind + "-" + type + "-field-" + room).checked) {
                returnColumnsGroupArray.push(kind + "_" + room);
            }
        }
    }
    return returnColumnsGroupArray;
};


let getTheConditionsArray = function (conditionsArray, kind) {
    let allConditionObjectsArray = [];
    for (let conditionElement of conditionsArray) {
        let conditionObject = getTheCondition(kind, conditionElement); // creates the condition object
        if (conditionObject !== null) {
            allConditionObjectsArray.push(conditionObject);
        }
    }
    return allConditionObjectsArray;
};

let getTheCondition = function (kind, condition) {
    let isNotSelected = condition.getElementsByClassName("control not")[0].firstElementChild.checked;
    let fieldsArray = Array.from(condition.getElementsByClassName("control fields")[0].firstElementChild);
    let fieldType = fieldsArray.find(function (elm) {
        if(elm.selected){ return elm.value}}).value;
    let conditionOperator = Array.from(condition.getElementsByClassName("control operators")[0].firstElementChild).find(function (elm) {
        if(elm.selected){ return elm.value}}).value;
    let fieldGivenValue = condition.getElementsByClassName("control term")[0].firstElementChild.value;
    if(["LT", "GT", "EQ"].includes(conditionOperator)) {
        fieldGivenValue = parseFloat(fieldGivenValue);
    }
    let objectToReturn = {};
    if(isNotSelected) {
       objectToReturn["NOT"] = {};
       objectToReturn["NOT"][conditionOperator] = {};
       objectToReturn["NOT"][conditionOperator][kind + "_" + fieldType] = fieldGivenValue;
    }
    else {
        objectToReturn[conditionOperator] = {};
        objectToReturn[conditionOperator][kind + "_" + fieldType] = fieldGivenValue;
    }
    return objectToReturn;
};
