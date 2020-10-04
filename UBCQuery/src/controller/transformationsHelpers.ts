
import Log from "../Util";
import { Decimal } from "decimal.js";

function transformTheData(result: any[], transformations: any, options: any): any[] {
    let groupedData: any  = {}, groupArrayNames: any [] = transformations["GROUP"], finalGroupArray: any [] = [];
    for (let roomData of result) {
        let groupKeyValue: any = "Group";
        groupArrayNames.forEach((name: any) => {
            groupKeyValue = groupKeyValue + "-" + roomData[name];
        });
        if (Object.keys(groupedData).includes(groupKeyValue)) {
            groupedData[groupKeyValue].push(roomData);
        } else {
            groupedData[groupKeyValue] = [roomData];
        }
    }
    let appliedTokenResult: any [] = [], groupedArrayJoined: any [] = Object.values(groupedData), indexQ: any = 0;
    appliedTokenResult = this.applyToken(transformations["APPLY"], groupedArrayJoined);
    for (let arrayObj of groupedArrayJoined) {
        finalGroupArray = finalGroupArray.concat([arrayObj[0]]);
    }
    let finalGroupArray2: any[] = [], ultimateArray: any [] = finalGroupArray2, index: any = 0;
    for (let groupObj of finalGroupArray) {
        for (let groupObjKey of Object.keys(groupObj)) {
            if (groupArrayNames.includes(groupObjKey)) {
                let keyValue: any = groupObj[groupObjKey], objToPush: any = {};
                objToPush[groupObjKey] = keyValue;
                if (!finalGroupArray2[indexQ]) {
                    finalGroupArray2.push(objToPush);
                } else {
                    finalGroupArray2[indexQ][groupObjKey] = keyValue;
                }
            }
        }
        indexQ++;
    }
    for (let tokenobj of appliedTokenResult) {
        let field: any = Object.keys(tokenobj)[0], value: any = tokenobj[field];
        if (index === finalGroupArray2.length) {
            index = 0;
        }
        ultimateArray[index][field] = value;
        index++;
    }
    ultimateArray.forEach((elm: any) => {
        for (let objKey of Object.keys(elm)) {
            if (!options.COLUMNS.includes(objKey)) {
                delete (elm[objKey]);
            }
        }
    });
    return ultimateArray;
}

function applyToken(applyArray: any[], groupedArrayJoined: any[]): any[] {
    let appliedResult: any [] = [];
    for (let applyObj of applyArray) {
        for (let groupObjArray of groupedArrayJoined) {
            let applyRuleFieldName: any = Object.keys(applyObj)[0];
            let applyRuleKey: any = Object.keys(applyObj[applyRuleFieldName])[0];
            let applyRuleParamter: any = applyObj[applyRuleFieldName][applyRuleKey];
            let applyRuleValue: any = this.getTheApplyValue(applyRuleKey, applyRuleParamter, groupObjArray);
            let ruleobjectToPutOn: any = {};
            ruleobjectToPutOn[applyRuleFieldName] = applyRuleValue;
            appliedResult.push(ruleobjectToPutOn);
        }
    }
    return appliedResult;
}

function getTheApplyValue(applyRuleKey: any, applyRuleParameter: any, groupArrayObj: any[]): any {
    if (applyRuleKey === "MAX") {
        let maxSoFar: any;
        for (let obj of groupArrayObj) {
            if (!maxSoFar) {
                maxSoFar =   obj[applyRuleParameter];
            } else {
                maxSoFar = Math.max(maxSoFar, obj[applyRuleParameter]);
            }
        }
        return maxSoFar;
    }
    if (applyRuleKey === "MIN") {
        let minSoFar: any;
        for (let obj of groupArrayObj) {
            if (!minSoFar) {
                minSoFar =   obj[applyRuleParameter];
            } else {
                minSoFar = Math.min(minSoFar, obj[applyRuleParameter]);
            }
        }
        return minSoFar;
    }
    if (applyRuleKey === "SUM") {
        let sumSofar: any;
        for (let obj of groupArrayObj) {
            if (!sumSofar) {
                sumSofar =   Number(obj[applyRuleParameter].toFixed(2));
            } else {
                sumSofar += Number(obj[applyRuleParameter].toFixed(2));
            }
        }
        return Number(sumSofar.toFixed(2));
    }
    return this.helperCountAvg(applyRuleKey, applyRuleParameter, groupArrayObj);
}

function helperCountAvg(applyRuleKey: any, applyRuleParameter: any, groupArrayObj: any[]) {
    if (applyRuleKey === "COUNT") {
        let countSofar: any = 0;
        let valuesSeenSofar: any[] = [];
        for (let obj of groupArrayObj) {
            if (!valuesSeenSofar.includes(obj[applyRuleParameter])) {
                countSofar++;
            }
            valuesSeenSofar.push(obj[applyRuleParameter]);
        }
        return countSofar;
    }
    if (applyRuleKey === "AVG") {
        let total: Decimal;
        let numRows: any = 0;
        for (let obj of groupArrayObj) {
            if (!total) {
                total = new Decimal(obj[applyRuleParameter]);
            } else {
                let newdecimal: Decimal = new Decimal(obj[applyRuleParameter]);
                total = Decimal.add(total, newdecimal);
            }
            numRows++;
        }
        let avg = total.toNumber() / numRows;
        return Number(avg.toFixed(2));
    }
}

function sortAKey(resultSorted: any[], order: any): any[] {
    let sortedResult: any [] = [];
    sortedResult = resultSorted.sort((obj1: any, obj2: any) => {
        if ((typeof obj1[order] === "number") && (typeof obj2[order] === "number")) {
            return obj1[order] - obj2[order];
        }
        if ((typeof obj1[order] === "string") && (typeof obj2[order] === "string")) {
            return obj1[order] < obj2[order] ? -1 : obj1[order] > obj2[order] ? 1 : 0;
        }
    });
    return sortedResult;
}

function sortMultipleKeys(result: any [], query: any) {
    let resultToReturn: any [] = [];
    resultToReturn = result.sort((obj1: any, obj2: any) => {
        return this.sortifyKey(obj1, obj2, query, 0);
    });
    return resultToReturn;
}

function sortifyKey(obj1: any, obj2: any, query: any, index: any): any {
    let direction: any = query.OPTIONS.ORDER.dir;
    let keysArray: any [] = query.OPTIONS.ORDER.keys;
    if (index >= keysArray.length) {
        return 0;
    }
    if (direction === "UP") {
        return obj1[keysArray[index]] < obj2[keysArray[index]] ? -1 :
            obj1[keysArray[index]] > obj2[keysArray[index]] ? 1 : this.sortifyKey(obj1, obj2, query, ++index);
    }
    if (direction === "DOWN") {
        return obj1[keysArray[index]] > obj2[keysArray[index]] ? -1 :
            obj1[keysArray[index]] < obj2[keysArray[index]] ? 1 : this.sortifyKey(obj1, obj2, query, ++index);
    }
}
export {
    transformTheData,
    applyToken,
    getTheApplyValue,
    helperCountAvg,
    sortAKey,
    sortMultipleKeys,
    sortifyKey
};
