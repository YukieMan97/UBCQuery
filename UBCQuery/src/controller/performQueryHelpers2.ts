import {
    filterArray,
    mfieldArray,
    sfieldArray,
    applyTokenArray,
    roomsFieldArray,
    coursesFieldArray,
    hasLengthZero
} from "./performQueryHelpers1";
import {DataSetsObject} from "./dataSetsObject";
let idString: any;

function resetID() {
    idString = undefined;
}

function checkAllKeys(obj: any): boolean {
    const keyOfWhere = (Object.keys(obj.WHERE))[0];
    if ((keyOfWhere === "AND") || (keyOfWhere === "OR")) {
        if (hasLengthZero(obj.WHERE[keyOfWhere])) {
            return false;
        } else {
            return checkAndOrKey(obj.WHERE[keyOfWhere]);
        }
    }
    if (["EQ", "LT", "GT", "IS"].includes(keyOfWhere)) {
        return checkFilterKey(keyOfWhere, obj.WHERE[keyOfWhere]);
    }
    if (keyOfWhere === "NOT") {
        return checkNotKey(obj.WHERE.NOT);
    }
    return false;
}

function checkAndOrKey(andOrKey: any): boolean {
    // if (Object.keys(andOrKey).length === 0 ) {
    //     return false;
    // }
    let h = 0, arraySize = andOrKey.length, i;
    while (h < arraySize) {
        for (i in andOrKey) {
            const keyObject = Object.keys(andOrKey[i]), key = (Object.keys(andOrKey[i]))[0],
                val = Object.values(andOrKey[i]);
            h += 1;
            if (["AND", "OR"].includes(key)) {
                if (!continueWithKey(key, val)) {
                    return false;
                }
            } else {
                if (!determineKey(key, keyObject, val)) {
                    return false;
                }
            }
        }
    }
    return true;
}

function continueWithKey(key: any, val: any): boolean {
    let h = 0, arraySize = val.length, j, k;
    while (h < arraySize) {
        for (j in val) {
            if (hasLengthZero(Object.values(val[j]))) {
                return false;
            }
            const val2 = Object.values(val[j]);
            for (k in val2) {
                const key3Obj = (Object.keys(val2[k])), key3 = (Object.keys(val2[k]))[0], val3 = Object.values(val2[k]);
                if (["AND", "OR"].includes(key3)) {
                    if (!continueWithKey(key3, val3)) {
                        return false;
                    }
                } else {
                    if (!determineKey(key3, key3Obj, val3)) {
                        return false;
                    }
                }
            }
            h += 1;
            if (h === (arraySize)) {
                break;
            }
        }
    }
    return true;
}

function determineKey(keyString: string, keyObject: any, val: any): boolean {
    if ("NOT" === keyString) {
        if (keyObject.length === 1) {
            const obj = val[0], objKey = Object.keys(obj), objValue = Object.values(obj),
                objKeyString = objKey.toString(), objValueObject = objValue[0];
            if (filterArray.includes(objKeyString)) {
                if (["AND", "OR"].includes(objKeyString)) {
                    return checkAndOrKey(val[0]);
                }
                if ("NOT" === objKeyString) {
                    return checkNotKey(obj);
                }
                // passing in objString -- not sure if ok
                const objString = Object.keys(obj)[0];
                return checkFilterKey(objString, objValueObject);
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        if (!filterArray.includes(keyString)) {
            return false;
        }
        if (keyObject.length === 1) {
            const objKeyString = (Object.keys(val[0])[0]).toString(), objValue = Object.values(val[0])[0];
            if (isValidKey(objKeyString)) {
                if (!checkCompatability(keyString, objKeyString)) {
                    return false;
                }
                return checkFieldAndValType(objKeyString, objValue);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}

function checkFilterKey(keyOfObject: any, obj: any): boolean {
    const objKey = (Object.keys(obj))[0];
    const objVal = (Object.values(obj))[0];
    if (objKey === undefined) {
        return false;
    }
    if (Object.keys(obj).length > 1) {
        return false;
    }
    // keyOfObject should be string
    const keyString = objKey.toString();
    if (!checkCompatability(keyOfObject, keyString)) {
        return false;
    }
    if (isValidKey(keyString)) {
        return checkFieldAndValType(keyString, objVal);
    } else {
        return false;
    }
}

function checkCompatability(keyString: any, objKeyString: any): boolean {
    if (["EQ", "GT", "LT"].includes(keyString)) {
        return mfieldArray.includes(objKeyString.split("_")[1]);
    } else {
        return sfieldArray.includes(objKeyString.split("_")[1]);
    }
}

function checkNotKey(notKey: any): boolean {
    const keyObject = Object.keys(notKey), key = (Object.keys(notKey))[0], val = Object.values(notKey);
    if (["AND", "OR"].includes(key)) {
        return continueWithKey(key, val);
    } else {
        return determineKey(key, keyObject, val);
    }
}

function isValidKey(keyString: any): boolean {
    let dataSets: any = new DataSetsObject();
    dataSets.loadDataFromDisk();
    if (keyString.includes("_")) {
        let field: any = keyString.split("_")[1];
        let currentId: any = keyString.split("_")[0];
        if (dataSets.data && dataSets.data[currentId]) {
            let dataKind: any = dataSets.data[currentId].kind;
            if (roomsFieldArray.includes(field) && dataKind === "courses") {
                return  false;
            }
            if (coursesFieldArray.includes(field) && dataKind === "rooms") {
                return  false;
            }
        }
        if (!(dataSets.data && Object.keys(dataSets.data).includes(currentId))) {
            return false;
        }
        if (idString === undefined) {
            idString = currentId;
        }
        if (idString === currentId) {
            if (mfieldArray.includes(keyString.split("_")[1])) {
                return true;
            } else {
                return sfieldArray.includes(keyString.split("_")[1]);
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function checkFieldAndValType(keyString: string, valueIndexed: any): boolean {
    const field = keyString.split("_")[1];
    if (mfieldArray.includes(field)) {
        // return (((typeof valueIndexed) === "number") && (valueIndexed >= 0));
        if (["lat", "lon"].includes(field)) {
            return (typeof valueIndexed) === "number";
        }
        return ((typeof valueIndexed) === "number") && (valueIndexed >= 0);
    } else if (sfieldArray.includes(field)) {
        if ((typeof valueIndexed) === "string") {
            if (valueIndexed.length === 1) {
                if (valueIndexed[0] === "*") {
                    return true;
                }
            }
            if (valueIndexed.length === 2) {
                if (valueIndexed[0] === "*" && valueIndexed[1] === "*") {
                    return true;
                }
            }
            const valueAsteriskCheck = valueIndexed.substring(1, (valueIndexed.length - 1));
            return !(valueAsteriskCheck.includes("*"));
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function checkApplyToken(applyToken: any, value: any): boolean {
    if (applyTokenArray.includes(applyToken)) {
        if (applyToken === "COUNT") {
            return true;
        } else {
            return (mfieldArray.includes(value.split("_")[1]));
        }
    } else {
        return false;
    }
}

export {
    checkAllKeys,
    determineKey,
    isValidKey,
    idString,
    resetID,
    checkApplyToken
};
