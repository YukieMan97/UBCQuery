// process Query by returning the result with its specifications;
import Log from "../Util";
import {DataSetsObject} from "./dataSetsObject";


function processQuery(ebnfObj: any): any[] {
    let result: any[] = [];
    let whereKeys: any[] = Object.keys(ebnfObj.WHERE);
    let lastOccurenceKey: any = whereKeys[whereKeys.length - 1];
    if (lastOccurenceKey === "AND") {
        result = processAndKey(ebnfObj.WHERE.AND);
    }
    if (lastOccurenceKey === "OR") {
        result = processOrKey(ebnfObj.WHERE.OR);
    }
    if (["EQ", "LT", "GT", "IS"].includes(lastOccurenceKey)) {
        result = processFilterKey(ebnfObj.WHERE[lastOccurenceKey], lastOccurenceKey);
    }
    if (lastOccurenceKey === "NOT") {
        result = processNotKey(ebnfObj.WHERE.NOT);
    }
    if (whereKeys.length === 0) {
        let dataSets: any = new DataSetsObject();
        dataSets.loadDataFromDisk();
        let id: any = Object.keys(dataSets.data)[0];
        return dataSets.data[id].dataArray;
    }
    return result;
}

function processAndKey(andArray: any): any[] {
    let resultSoFar: any[] = [];
    for (let element of andArray) {
        let i: any = andArray.indexOf(element);
        let keyType: string = Object.keys(element).toString();
        if (["EQ", "LT", "GT", "IS"].includes(keyType)) {
            if (i === 0) {
                resultSoFar = processFilterKey(element[keyType], keyType);
            } else {
                let ResultToFilterFrom: any[] = processFilterKey(element[keyType], keyType);
                ResultToFilterFrom = ResultToFilterFrom.map(function (obj: any) {
                    return JSON.stringify(obj);
                });
                resultSoFar = resultSoFar.filter(function (obj: any) {
                    return ResultToFilterFrom.includes(JSON.stringify(obj).toString());
                }.bind(this));
            }
        }
        if (keyType === "AND") {
            resultSoFar = processAndKeyAnd(i, resultSoFar, element);
        }
        if (keyType === "OR") {
            if (i !== 0) {
                let ResultToFilterFrom: any[] = processAndKey(element.OR);
                ResultToFilterFrom = ResultToFilterFrom.map(function (obj: any) {
                    return JSON.stringify(obj);
                });
                resultSoFar = resultSoFar.filter(function (obj: any) {
                    return ResultToFilterFrom.includes(JSON.stringify(obj));
                }.bind(this));
            } else {
                resultSoFar = processOrKey(element.OR);
            }
        }
        if (keyType === "NOT") {
            if (i === 0) {
                resultSoFar = processNotKey(element.NOT);
            } else {
                let ResultToFilterFrom: any[] = processNotKey(element.NOT);
                ResultToFilterFrom = ResultToFilterFrom.map(function (obj: any) {
                    return JSON.stringify(obj);
                });
                resultSoFar = resultSoFar.filter(function (obj: any) {
                   return ResultToFilterFrom.includes(JSON.stringify(obj));
                }.bind(this));
            }
        }
    }
    return resultSoFar;
}

function processAndKeyAnd(i: any, resultSoFarr: any[], element: any): any[] {
    let resultSoFar: any[] = resultSoFarr;
    if (i !== 0) {
        let ResultToFilterFrom: any[] = processAndKey(element.AND);
        ResultToFilterFrom = ResultToFilterFrom.map(function (obj: any) {
            return JSON.stringify(obj);
        });
        resultSoFar = resultSoFar.filter(function (obj: any) {
            return ResultToFilterFrom.includes(JSON.stringify(obj));
        }.bind(this));
    } else {
        resultSoFar = processAndKey(element.AND);
    }
    return resultSoFar;
}

function processOrKey(OrArray: any) {
    let filteredArray: any[] = [];
    for (let element of OrArray) {
        let keyType: string = Object.keys(element).toString();
        if (["EQ", "LT", "GT", "IS"].includes(keyType)) {
            filteredArray = addUpArray(filteredArray, processFilterKey(element[keyType], keyType));
        }
        if (keyType === "AND") {
            filteredArray = addUpArray(filteredArray, processAndKey(element.AND));
        }
        if (keyType === "OR") {
            filteredArray = addUpArray(filteredArray, processOrKey(element.OR));
        }
        if (keyType === "NOT") {
            filteredArray = addUpArray(filteredArray, processNotKey(element.NOT));
        }
    }
    return filteredArray;
}

function processNotKey(notObject: any): any[] {
    let dataSets: any = new DataSetsObject();
    dataSets.loadDataFromDisk();
    let filteredArray: any[] = dataSets;
    let nowObject: any = notObject;

    while (!(Object.keys(nowObject).includes("IS") ||
        Object.keys(nowObject).includes("EQ") || Object.keys(nowObject).includes("GT") ||
        Object.keys(nowObject).includes("LT"))) {
        nowObject = Object.values(nowObject)[0];
    }
    const id: string = Object.keys(Object.values(nowObject)[0])[0].split("_")[0];
    let allDataArray: any[] = dataSets.data[id].dataArray;
    Log.info("id: " + id);
    for (let key in notObject) {
        if (["EQ", "LT", "GT", "IS"].includes(key)) {
            let arrayResult: any[] = processFilterKey(notObject[key], key);
            filteredArray = removefirstArrayOccurences(arrayResult, allDataArray);
        }
        if (key === "AND") {
            filteredArray = removefirstArrayOccurences(processAndKey(notObject.AND), allDataArray);
        }
        if (key === "OR") {
            let arrayResult: any[] = processOrKey(notObject.OR);
            filteredArray = removefirstArrayOccurences(arrayResult, allDataArray);
        }
        if (key === "NOT") {
            let notNotKey: any = Object.keys(notObject.NOT)[0];
            if (["EQ", "LT", "GT", "IS"].includes(notNotKey)) {
                filteredArray = processFilterKey(notObject.NOT[notNotKey], notNotKey);
            }
            if (notNotKey === "AND") {
                filteredArray = processAndKey(notObject.NOT.AND);
            }
            if (notNotKey === "OR") {
                filteredArray = processOrKey(notObject.NOT.OR);
            }
            if (notNotKey === "NOT") {
                filteredArray = processNotKey(notObject.NOT.NOT);
            }
        }
    }
    return filteredArray;
}

function removefirstArrayOccurences (array1: any[], array2: any[]): any[] {
    let Finale: any[] = [];
    let newHashArray1: any[] = array1.map(function (object: any) {
        return JSON.stringify(object);
    });
    for (let i of array2) {
        if (newHashArray1.includes(JSON.stringify(i))) {
            continue;
        } else {
            Finale.push(i);
        }
    }
    return Finale;
}

function addUpArray (array1: any[], array2: any[]): any[] {
    let newResult: any[] = [];
    for (let i of array2) {
        if (array1.some(function (obj: any) {
            return JSON.stringify(i) === JSON.stringify(obj);
        })) {
            if (newResult.some(function (elm: any) {
                return JSON.stringify(elm) === JSON.stringify(i);
            })) {
                continue;
            } else {
                newResult.push(i);
            }
        } else {
            newResult.push(i);
        }
    }
    for (let i of array1) {
        if (array2.some(function (obj: any) {
            return JSON.stringify(i) === JSON.stringify(obj);
        })) {
            if (newResult.some(function (elm: any) {
                return JSON.stringify(elm) === JSON.stringify(i);
            })) {
                continue;
            } else {
                newResult.push(i);
            }
        } else {
            newResult.push(i);
        }
    }
    return newResult;
}

function processFilterKey(keyObject: any, filterType: any): any[] {
    let dataSets: any = new DataSetsObject();
    dataSets.loadDataFromDisk();
    let returnArray: any[];
    const key = Object.keys(keyObject)[0];
    // const id: string = key.split("_")[0];
    switch (filterType) {
        case "GT": {
            returnArray =  dataSets.data[key.split("_")[0]].dataArray.filter(function (obj: any) {
                return obj[key] > Object.values(keyObject)[0];
            });
            break;
        }
        case "LT": {
            returnArray =  dataSets.data[key.split("_")[0]].dataArray.filter(function (obj: any) {
                return obj[key] < Object.values(keyObject)[0];
            });
            break;
        }
        case "EQ": {
            returnArray =  dataSets.data[key.split("_")[0]].dataArray.filter(function (obj: any) {
                return obj[key] === Object.values(keyObject)[0];
            });
            break;
        }
        case "IS": {
            returnArray = dataSets.data[key.split("_")[0]].dataArray.filter(function (obj: any) {
                let stringValue: any = (Object.values(keyObject)[0]).toString();
                if (stringValue === "*") {
                    return true;
                }
                if (stringValue.startsWith("*") && stringValue.endsWith("*")) {
                    // let remaingPartOnMiddle: any = stringValue.slice(1, stringValue.length - 1);
                    return obj[key].includes(stringValue.slice(1, stringValue.length - 1));
                }
                if ((stringValue.charAt(0) === "*")) {
                    // let remaingPartOnRight: any = stringValue.slice(1, stringValue.length);
                    return obj[key].endsWith(stringValue.slice(1, stringValue.length));
                }
                if (stringValue.endsWith("*")) {
                    // let remaingPartOnLeft: any = stringValue.slice(0, stringValue.length - 1);
                    return obj[key].startsWith(stringValue.slice(0, stringValue.length - 1));
                } else {
                    return obj[key] === Object.values(keyObject)[0];
                }
            });
            break;
        }
        default: {
            break;
        }
    }
    return returnArray;
}

export {
    processQuery,
};
