import {
    checkAllKeys,
    isValidKey,
    checkApplyToken
} from "./performQueryHelpers2";
import Log from "../Util";

const filterArray: string[] = ["AND", "OR", "GT", "LT", "EQ", "IS", "NOT"];
const mfieldArray: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const sfieldArray: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href"];
const applyTokenArray: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
const directionArray: string[] = ["UP", "DOWN"];
const roomsFieldArray: string[] = ["lat", "lon", "seats", "shortname", "fullname", "number", "name", "address", "type",
    "furniture", "href"];
const coursesFieldArray: string[] = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title",
    "uuid"];

function checkWhereOptionsTransformations(obj: any): boolean {
    let allKeysValid: boolean = true;
    allKeysValid = Object.keys(obj).every((function (elm: any) {
        return ["WHERE", "OPTIONS", "TRANSFORMATIONS"].includes(elm);
    }));
    if (!allKeysValid) {
        return false;
    }
    if (obj.hasOwnProperty("WHERE")) {
        if (obj.WHERE === undefined || obj.WHERE === null) {
            return false;
        }
        if (Object.keys(obj.WHERE).length === 0) {
            return true;
        }
        if (Object.keys(obj.WHERE).length > 1) {
            let firstKey = Object.keys(obj.WHERE)[0];
            Log.info(firstKey);
            let isWhereInvalid: any = Object.keys(obj.WHERE).every((elm: any) => {
               return  elm === firstKey;
            });
            if (!isWhereInvalid) {
                return false;
            }
        }
        if (hasLengthZero(Object.keys(obj.WHERE))) {
            return false;
        }
    }
    if (obj.hasOwnProperty("WHERE") && obj.hasOwnProperty("OPTIONS") && obj.OPTIONS.hasOwnProperty("COLUMNS")) {
        if (hasLengthZero(obj.OPTIONS.COLUMNS)) {
            return false;
        } else {
            return checkOptions(obj);
        }
    } else {
        return false;
    }
}

function checkOptions(obj: any): boolean {
    let options = obj.OPTIONS;
    let allKeysValid: any = true;
    allKeysValid = Object.keys(options).every((function (elm: any) {
        return ["COLUMNS", "ORDER"].includes(elm);
    }));
    if (!allKeysValid) {
        return false;
    }
    if (options.hasOwnProperty("ORDER")) {
        if (obj.OPTIONS.ORDER === undefined || obj.OPTIONS.ORDER === null) {
            return false;
        }
        if (!checkOrder(options)) {
            return false;
        }
    }
    if (obj.hasOwnProperty("TRANSFORMATIONS")) {
        return checkTransformations(obj);
    } else {
        let checkedColumns = checkColumns(obj);
        return checkedColumns.valid;
    }
}

function checkOrder(options: any): boolean {
    const order = options.ORDER;
    if (order.hasOwnProperty("dir")) {
        if (order.hasOwnProperty("keys")) {
            return checkDirAndKeys(options, order);
        } else {
            return false;
        }
    } else if (order.hasOwnProperty("keys")) {
        return false;
    } else {
        return (options.COLUMNS.includes(options.ORDER));
    }
}

function checkColumns(obj: any) {
    let validity = true, arrays = makeColumnsArrays(obj);
    if (arrays.bool === true) {
        let columnsKeyArray = arrays.keysArray, columnsApplyKeyArray = arrays.applyKeyArray;
        if (!hasLengthZero(columnsApplyKeyArray)) {
            validity = false;
        } else {
            return {
                valid: validity,
                keysArray0: columnsKeyArray
            };
        }
    }
    validity = false;
    return {
        valid: validity,
        keysArray0: null
    };
}

function checkDirAndKeys(options: any, order: any): boolean {
    if (hasLengthZero(order.keys)) {
        return false;
    } else {
        if (directionArray.includes(order.dir)) {
            let keys = order.keys, keysSize = keys.length;
            for (let i = 0; i < keysSize; i++) {
                let keyString = (Object.values(keys)[i]).toString();
                if (!(options.COLUMNS).includes(keyString)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }
}

function checkTransformations(obj: any): boolean {
    let transformationsObject = obj.TRANSFORMATIONS;
    if (hasLengthZero(Object.entries(transformationsObject))) {
        return false;
    } else {
        // if (hasLengthZero(transformationsObject.GROUP) || hasLengthZero(transformationsObject.APPLY)) {
        if (hasLengthZero(transformationsObject.GROUP)) {
            return false;
        } else {
            let arrays = makeColumnsArrays(obj);
            if (arrays.bool === true) {
                let columnsKeyArray: string[] = arrays.keysArray, columnsApplyKeyArray: string[] = arrays.applyKeyArray,
                    groupChecked = checkGroupKeys(transformationsObject, columnsKeyArray), groupKeyArray: string[] = [];
                if (groupChecked.bool === true) {
                    groupKeyArray = groupChecked.groupKeysArray;
                    let applyChecked = checkApplyKeys(transformationsObject, columnsApplyKeyArray);
                    if (applyChecked.bool === true) {
                        columnsApplyKeyArray = applyChecked.applyKeyArray;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
                return (hasLengthZero(columnsApplyKeyArray) && hasLengthZero(groupKeyArray));
            } else {
                return false;
            }
        }
    }
}

function makeColumnsArrays(obj: any) {
    let validity = true, columnsKeyArray: string[] = [], columnsApplyKeyArray: string[] = [];
    for (let i = 0; i < (obj.OPTIONS.COLUMNS.length); i++) {
        let keyString = (Object.values(obj.OPTIONS.COLUMNS)[i]).toString();
        if (keyString.includes("_")) {
            if (isValidKey(keyString)) {
                columnsKeyArray.push(keyString);
            } else {
                validity = false;
                break;
            }
        } else {
            columnsApplyKeyArray.push(keyString);
        }
    }
    return {
        keysArray: columnsKeyArray,
        applyKeyArray: columnsApplyKeyArray,
        bool: validity
    };
}

function checkGroupKeys(transformationsObject: any, columnsKeyArray: string[]) {
    let validity = true;
    let groupKeyArray = JSON.parse(JSON.stringify(transformationsObject.GROUP));
    for (let obj of columnsKeyArray) {
        if (groupKeyArray.includes(obj)) {
            const index = groupKeyArray.indexOf(obj);
            groupKeyArray.splice(index, 1);
        } else {
            validity = false;
            break;
        }
    }
    if (!hasLengthZero(groupKeyArray)) {
        let groupKeyArrayUnspliced = JSON.parse(JSON.stringify(groupKeyArray));
        for (let obj of groupKeyArrayUnspliced) {
            if (!isValidKey(obj.toString())) {
                validity = false;
                break;
            }
            const index = groupKeyArray.indexOf(obj);
            groupKeyArray.splice(index, 1);
        }
    }
    return {
        groupKeysArray: groupKeyArray,
        bool: validity
    };
}

function checkApplyKeys(transformationsObject: any, columnsApplyKeyArray: string[]) {
    let validity = true;
    for (let obj of transformationsObject.APPLY) {
        let applyRule = obj, applyRuleString = Object.keys(applyRule).toString(),
            applyToken = Object.keys(Object.values(applyRule)[0])[0],
            value = Object.values(Object.values(applyRule)[0])[0];
        if (checkApplyToken(applyToken, value) && isValidKey(value)) {
            if (hasLengthZero(columnsApplyKeyArray)) {
                validity = true;
                break;
            } else {
                if (columnsApplyKeyArray.includes(applyRuleString)) {
                    const index = columnsApplyKeyArray.indexOf(applyRuleString);
                    columnsApplyKeyArray.splice(index, 1);
                } else {
                    validity = false;
                    break;
                }
            }
        } else {
            validity = false;
            break;
        }
    }
    return {
        applyKeyArray: columnsApplyKeyArray,
        bool: validity
    };
}

function hasLengthZero(obj: any): boolean {
    if (obj === undefined || obj === null) {
        return true;
    }
    return Object.keys(obj).length === 0;
}

function checkWhereKey(obj: any): boolean {
    const whereObject = Object.entries(obj.WHERE);
    if (hasLengthZero(whereObject)) {
        return true;
    } else {
        if (filterArray.includes((Object.keys(obj.WHERE))[0])) {
            return checkAllKeys(obj);
        } else {
            return false;
        }
    }
}

export {
    filterArray,
    mfieldArray,
    sfieldArray,
    applyTokenArray,
    roomsFieldArray,
    coursesFieldArray,
    hasLengthZero,
    checkWhereOptionsTransformations,
    checkWhereKey
};
