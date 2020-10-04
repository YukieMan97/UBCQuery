import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as fs from "fs-extra";
import {DataSetsObject} from "./dataSetsObject";
import {
    checkWhereOptionsTransformations,
    checkWhereKey
} from "./performQueryHelpers1";
import {processQuery} from "./performQueryHelpers3";
import { resetID } from "./performQueryHelpers2";
import { getTheLATLON,
    getTheBuildingInfo,
    getAllTheTDSArray,
    getTheTBodyObjectForRooms,
    getTheFullRoomObject} from "./roomsHelpers";
import {
    transformTheData,
    sortAKey,
    sortMultipleKeys
} from "./transformationsHelpers";
import * as p5 from "parse5";
import * as http from "http";
import JSZip = require("jszip");
import {rename} from "fs";
import { Decimal } from "decimal.js";
import {analyzeScope} from "@typescript-eslint/parser/dist/analyze-scope";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset (id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return new Promise((resolveFinal, reject) => {
            let dataSets: any = new DataSetsObject();
            dataSets.loadDataFromDisk();
            if (this.isThereAnyError(id, kind, content, dataSets)) {
                reject(new InsightError("Invalid ID"));
                return;
            }
            if (kind === InsightDatasetKind.Courses) {
                let finalObject: object[] = [];
                let zipFile = new JSZip();
                return zipFile.loadAsync(content, { base64: true })
                    .then(async (result: JSZip) => {
                        let filesPromisses: Array<Promise<string>> = [];
                        for (let filesObjectKey in result.files) {
                            if (filesObjectKey.startsWith("courses/") && "courses/" !== filesObjectKey
                                && !result.files[filesObjectKey].dir && filesObjectKey.split("/").length === 2 ) {
                                filesPromisses.push(result.files[filesObjectKey].async("text"));
                            }
                        }
                        Promise.all(filesPromisses)
                            .then((valueArrays: any) => {
                                finalObject = dataSets.addToSet(id, valueArrays);
                            }).
                        then((value) => {
                            if (finalObject.length === 0) {
                                return reject(new InsightError("The dataset is invalid"));
                            }
                            this.dostuffForcourses(finalObject, dataSets, id, kind);
                        }).then((value) => {
                            resolveFinal(Object.keys(dataSets.data));
                            return;
                        });
                    }).catch((err: any) => {
                        return reject(new InsightError("Oops got an error"));
                    });
            }
            this.dostuff(id, content, kind).then((value: any) => {
                if (value === 0) {
                    return reject(new InsightError("Oops got an error"));
                }
                return resolveFinal([id]);
            }).catch((err: any) => {
                return reject(new InsightError("Oops got an error"));
            });
        });
    }

    public isThereAnyError(id: any, kind: any, content: any, dataSets: any): any {
        return  [null, undefined, "", "_"].includes(id) || [null, undefined, ""].includes(content) ||
            Object.keys(dataSets.data).includes(id) || (id.replace(/\s/g, "").length === 0)
            || ![InsightDatasetKind.Courses, InsightDatasetKind.Rooms].includes(kind);
    }

    public dostuffForcourses(finalObject: any, dataSets: any, id: any, kind: any) {
        if (finalObject.length !== 0) {
            dataSets.data[id] = {
                id,
                kind,
                numRows: finalObject.length,
                dataArray: finalObject,
            };
        }
        let s = { id, kind, numRows: dataSets.data[id].numRows, data: dataSets.data[id].dataArray};
        fs.writeFileSync("data/" + id + ".json", JSON.stringify(s));
    }

    public dostuff(id: any, content: any, kind: any): Promise<any> {
        let zipFile = new JSZip();
        let allTheRooms: any = [];
        let filesPromissesBuildings: Array<Promise<string>> = [];
        let buildingArray: any [] = [];
        return new Promise((resolveLower, reject) => {
            return zipFile.loadAsync(content, {base64: true}).then((result: JSZip) => {
                return result.file("rooms/index.htm").async("text").then((html: string) => {
                    return this.setThfilePromisses(html);
                });
            }).then((filesPromisses: any[]) => {
                return Promise.all(filesPromisses);
            }).then((resultArray: any) => {
                let roomsZipFile: any = new JSZip();
                buildingArray = resultArray;
                return roomsZipFile.loadAsync(content, {base64: true}).then((resultRooms: JSZip) => {
                    for (let obj of resultArray) {
                        filesPromissesBuildings.push(resultRooms.
                        file("rooms/campus/discover/buildings-and-classrooms/"
                            + obj.buildingCode).async("text"));
                    }
                });
            }).then(() => {
                return Promise.all(filesPromissesBuildings).then((buildingRoomsResultArray: any[]) => {
                    allTheRooms = this.getAllTheRooms(id, buildingRoomsResultArray, buildingArray);
                    let s = {id, kind, data: allTheRooms};
                    fs.writeFileSync("data/" + id + ".json", JSON.stringify(s));
                }).then((value: any) => {
                    return resolveLower(allTheRooms.length);
                });
            }).catch((err: any) => {
                let test = 0;
            });
        });
    }

    public setThfilePromisses(html: any): any[] {
        let parsedHTLM: any = p5.parse(html);
        let allTRSAllTDS: any[] = getAllTheTDSArray(parsedHTLM);
        let filesPromisses: Array<Promise<string>> = [];
        for (let currentTD of allTRSAllTDS) {
            let buildingObject: any = getTheBuildingInfo(currentTD);
            let myUri = encodeURI(buildingObject.buildingAddress);
            filesPromisses.push(getTheLATLON(buildingObject, myUri));
        }
        return filesPromisses;
    }

    public getAllTheRooms(id: any, buildingRoomsResultArray: any[], buildingArray: any[]): any[] {
        let allTheRooms: any[] = [];
        for (let building of buildingRoomsResultArray) {
            let parsedRoom = p5.parse(building);
            let tbody = getTheTBodyObjectForRooms(parsedRoom);
            let roomObject: any[] = [];
            if (tbody) {
                roomObject = getTheFullRoomObject(id, buildingArray, tbody);
            }
            for (let room of roomObject) {
                allTheRooms.push(room);
            }
        }
        return allTheRooms;
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise((resolve1, reject) => {
            let dataSets: any = new DataSetsObject();
            dataSets.loadDataFromDisk();
            if ([null, undefined, "", "_"].includes(id)) {
                reject(new InsightError("ID does not exists"));
                return;
            }
            if (id.replace(/\s/g, "").length === 0) {
                reject(new InsightError("ID only contains whitespace characters"));
                return;
            }
            if (!Object.keys(dataSets.data).includes(id)) {
                reject(new NotFoundError("Id already exits"));
            }
            delete dataSets.data[id];
            fs.unlink(`data/${id}.json`, (err) => {
                if (err) {
                    reject(new InsightError("The id has not been removed"));
                    return;
                }
                Log.trace("path/file.txt was deleted");
                resolve1(id);
                return;
            });
        });
    }

    public performQuery(query: any): Promise <any[]> {
        return new Promise((resolve: any, reject: any) => {
            let queryDeepCopy: any = JSON.parse(JSON.stringify(query));
            resetID();
            if ( query === undefined || query === null || Object.keys(query).length === 0) {
                reject(new InsightError());
                return;
            }
            if (!checkWhereOptionsTransformations(queryDeepCopy) || !checkWhereKey(queryDeepCopy)) {
                reject(new InsightError("TOO BIGGG"));
                return;
            }
            let resultFinal: any[] = processQuery(query);
            resultFinal = this.optionafyTheResult(resultFinal, query.OPTIONS, query.TRANSFORMATIONS);
            resultFinal = this.sortResult(resultFinal, query);
            if (resultFinal.length > 5000) {
                reject(new ResultTooLargeError());
                return;
            }
            resolve(resultFinal);
            return;
        });
    }
// OG

public sortResult(result: any[], query: any) {
    let order: any = query.OPTIONS.ORDER;
    if (order === undefined) {
        return result;
    }
    let resultToReturn: any [] = result;
    if (typeof order === "string") {
        resultToReturn = sortAKey(result, order);

    } else {
        resultToReturn = sortMultipleKeys(result, query);
    }
    return resultToReturn;
}

public optionafyTheResult(result: any[], options: any, transformations: any): any[] {
        let transformedResult: any [] = [];
        if (transformations) {
            transformedResult = transformTheData(result, transformations, options);
            return transformedResult;
        }
        for (let element of result) {
            for (let elementKey in element) {
                if (!(options.COLUMNS).includes(elementKey)) {
                    delete element[elementKey];
                }
            }
        }
        return result;
    }

public listDatasets(): Promise<InsightDataset[]> {
    return new Promise((resolveDone, reject) => {
        let arrayOfData: any[] = [];
        let dataSets: any = new DataSetsObject();
        dataSets.loadDataFromDisk();
        Object.keys(dataSets.data).forEach((idData: any) => {
            let dataSetObject: InsightDataset = {
                id: idData,
                kind: dataSets.data[idData].kind,
                numRows: dataSets.data[idData]["numRows"] || dataSets.data[idData].dataArray.length,
            };
            arrayOfData.push(dataSetObject);
        });
        resolveDone(arrayOfData);
        return;
    });
}
}
