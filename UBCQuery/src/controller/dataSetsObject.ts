import * as fs from "fs-extra";
export class DataSetsObject {
    public data: any;
    constructor() {
        this.data = {};
    }

    public loadDataFromDisk() {
        let filesInDataFolder: any[] = fs.readdirSync("./data");
        for (let item of filesInDataFolder) {
            if (item.endsWith(".json")) {
                let id: string = item.substring(0, item.length - 5);
                let pathOfFile: string = (`./data/${id}.json`);
                if (fs.existsSync(pathOfFile)) {
                    let resultData: any = fs.readFileSync(pathOfFile).toString();
                    this.data [id] = {
                        id,
                        kind: JSON.parse(resultData)["kind"],
                        numRows: JSON.parse(resultData)["numRows"],
                        dataArray: JSON.parse(resultData)["data"],
                    };
                }
            }
        }
    }

    public addToSet(id: string, valueArrays: any): any[] {
        let finalObject: any[] = [];
        for (let valueArrayObject of valueArrays) {
            if (valueArrayObject === "") {
                continue;
            }
            try {
                let o = JSON.parse(valueArrayObject);
            } catch (e) {
                continue;
            }
            let d = JSON.parse(valueArrayObject);
            let fieldsArray: any[] =
                ["Pass", "Fail", "id", "Title", "Subject", "Audit",
                    "Professor", "Avg", "Course", "Year"];
            for (let dResult of d["result"]) {
                if (fieldsArray.every((field: any) => {
                    return Object.keys(dResult).includes(field);
                })) {
                    let year: number = parseInt(dResult["Year"], 10);
                    if (dResult["Section"] === "overall") {
                        year = 1900;
                    }
                    let modifiedResult: any = {
                        dept: dResult["Subject"],
                        pass: dResult["Pass"],
                        fail: dResult["Fail"],
                        audit: dResult["Audit"],
                        instructor: dResult["Professor"],
                        id: dResult["Course"],
                        title: dResult["Title"],
                        year: year,
                        avg: dResult["Avg"],
                        uuid: (dResult["id"]).toString(),
                    };
                    let newModified: any = {};
                    Object.keys(modifiedResult).forEach((key: any) => {
                        newModified[`${id}_${key}`] = modifiedResult[key];
                    });
                    finalObject.push(newModified);
                }
            }
        }
        return finalObject;
    }
}

