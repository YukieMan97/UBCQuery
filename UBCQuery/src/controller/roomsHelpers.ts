import * as http from "http";

function getTheLATLON(buildingOBJ: any, myUri: any): Promise<string> {
    return new Promise(function (resolve, reject) {
        http.get(
            "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team024/"
            + myUri, (res) => {
                const { statusCode } = res;
                const contentType = res.headers["content-type"];
                let error;
                if (statusCode !== 200) {
                    error = new Error("Request Failed.\n" +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content-type.\n" +
                        `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    // console.error(error.message);
                    res.resume();
                    return;
                }
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        let buildObject = buildingOBJ;
                        buildObject.lat = parsedData.lat;
                        buildObject.lon = parsedData.lon;
                        resolve(buildObject);
                    } catch (e) {
                        // console.error(e.message);
                    }
                });
            }).on("error", (e) => {
                let test = 0;
            // console.error(`Got error: ${e.message}`);
        });
    });
}
function getAllTheTDSArray(html: any): any[] {
    let tbody: any =  this.getTheTBodyObject(html);
    let allTRS: any [] = tbody.childNodes.filter((elm: any) => {
        return  elm.nodeName === "tr";
    });
    let allTRSAllTDS: any[] = [];
    for (let currentTR of allTRS) {
        let trChildNodes: any[] = [];
        trChildNodes = currentTR.childNodes.filter((elm: any) => {
            return elm.nodeName === "td";
        });
        allTRSAllTDS.push(trChildNodes);
    }
    return allTRSAllTDS;
}

function getTheTBodyObject(html: any): any {
    if (Object.keys(html).length === 0) {
        return;
    }
    let indexName = html.nodeName;
    let indexedObject = html;
    let tmpArray: any[] = [];
    if ((indexName === "tbody") && this.validTBody(indexedObject)) {
        return indexedObject;
    } else {
        tmpArray = indexedObject.childNodes || [];
        for (let i of tmpArray) {
            if (this.getTheTBodyObject(i) === undefined) {
                continue;
            } else {
                return this.getTheTBodyObject(i);
            }
        }
    }
}
function getTheTBodyObjectForRooms(html: any): any {
    if (Object.keys(html).length === 0) {
        return;
    }
    let indexName = html.nodeName;
    let indexedObject = html;
    let tmpArray: any[] = [];
    if ((indexName === "tbody")) {
        return indexedObject;
    } else {
        tmpArray = indexedObject.childNodes || [];
        for (let i of tmpArray) {
            if (this.getTheTBodyObjectForRooms(i) === undefined) {
                continue;
            } else {
                return this.getTheTBodyObjectForRooms(i);
            }
        }
    }
}

function getTheBuildingInfo(currentTD: any): any {
    let buildingCode: any = currentTD[1].childNodes[0].value.trim();
    let buildingFullName: any = currentTD[2].childNodes[1].childNodes[0].value;
    let buildingAddress: any = currentTD[3].childNodes[0].value.trim();
    return {
        buildingCode,
        buildingFullName,
        buildingAddress,
    };
}
function validTBody(tbody: any) {
    return tbody && tbody["childNodes"] && tbody["childNodes"][1] && tbody["childNodes"][1]["childNodes"] &&
        tbody["childNodes"][1]["childNodes"][1] && tbody["childNodes"][1]["childNodes"][1]["attrs"] &&
        tbody["childNodes"][1]["childNodes"][1]["attrs"][0] &&
        tbody["childNodes"][1]["childNodes"][1]["attrs"][0]["value"] &&
        tbody["childNodes"][1]["childNodes"][1]["attrs"][0]["value"].includes("building");
}

function getTheFullRoomObject(id: any, buildingArray: any [], roomsBody: any): any [] {
    let roomsArray = [];
    let roomsTR = roomsBody.childNodes.filter(
        function (elm: any) {
            return elm.nodeName === "tr";
        });
    for (let tr of roomsTR) {
        let tdsOfTheTR = tr.childNodes.filter(
            function (elm: any) {
                return elm.nodeName === "td";
            });
        let numberr = tdsOfTheTR[0].childNodes[1].childNodes[0].value || "";
        let seats = parseInt(tdsOfTheTR[1].childNodes[0].value.trim(), 10) || 0;
        let furniture = tdsOfTheTR[2].childNodes[0].value.trim();
        let type = tdsOfTheTR[3].childNodes[0].value.trim();
        let href = tdsOfTheTR[4].childNodes[1].attrs[0].value;
        let buildinCode = href.split("/")[7].split("-")[0];
        let buildingIndex = 0;
        while (buildinCode !== buildingArray[buildingIndex].buildingCode) {
            buildingIndex++;
        }
        let buildingInfo = buildingArray[buildingIndex];
        let lat: any = buildingInfo.lat;
        let lon = buildingInfo.lon;
        let addres = buildingInfo.buildingAddress;
        let shortname = buildingInfo.buildingCode;
        let fullname = buildingInfo.buildingFullName;
        let roomObject: any = {};
        roomObject[ id + "_lat"] = lat;
        roomObject[ id + "_lon"] = lon;
        roomObject[ id + "_address"] = addres;
        roomObject[ id + "_shortname"] = shortname;
        roomObject[ id + "_fullname"] = fullname;
        roomObject[ id + "_number"] = numberr;
        roomObject[ id + "_seats" ] = seats;
        roomObject[ id + "_furniture"] = furniture;
        roomObject[ id + "_type"] = type;
        roomObject[ id + "_href"] = href;
        roomObject[ id + "_name"] = shortname + "_" + numberr;
        roomsArray.push(roomObject);
    }
    return roomsArray;
}

export {
    getTheLATLON,
    getTheBuildingInfo,
    getAllTheTDSArray,
    getTheTBodyObjectForRooms,
    getTheTBodyObject,
    getTheFullRoomObject,
    validTBody,
};
