import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import {rename} from "fs";
let timeSlotsArray: any[] = [
    "MWF 0800-0900", "MWF 0900-1000" , "MWF 1000-1100" ,
    "MWF 1100-1200", "MWF 1200-1300" , "MWF 1300-1400" ,
    "MWF 1400-1500", "MWF 1500-1600" , "MWF 1600-1700" ,
    "TR  0800-0930", "TR  0930-1100" , "TR  1100-1230" ,
    "TR  1230-1400", "TR  1400-1530" , "TR  1530-1700"
];
export default class Scheduler implements IScheduler {
    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let scheduledArray: any[] = [], timeSlotscoursesIDObject: any = {}, roomArrayObject: any = {};
        let maxLengthSoFar: any = Infinity, totalInputEnrollment: any = getTheTotalInputEnrollment(sections);
        let scheduledInputSoFar: any = 0, eSoFar: any = scheduledInputSoFar / totalInputEnrollment, dSoFar: any;
        for (let course of sortTheArray(sections)) {
            let courseEnrollmentSize = course["courses_pass"] + course["courses_fail"] + course["courses_audit"],
                courseID = course["courses_dept"] + course["courses_id"], courseFilled;
            for (let room of rooms) {
                let roomSize = room["rooms_seats"], roomName = room["rooms_shortname"] + room["rooms_number"];
                if (courseFilled) {
                    break;
                }
                for (let time of timeSlotsArray) {
                    if (!timeSlotscoursesIDObject[time] || (!timeSlotscoursesIDObject[time].includes(courseID))) {
                        if (roomSize >= courseEnrollmentSize) {
                            if (!roomArrayObject[roomName] || !roomArrayObject[roomName].includes(time)) {
                                let futureEWillBe: any = (scheduledInputSoFar + courseEnrollmentSize)
                                    / totalInputEnrollment, futureDWillBe: any, futureMaxDistance: any;
                                if (scheduledArray.length === 0) {
                                    maxLengthSoFar = 0, dSoFar = 0, futureDWillBe = 0;
                                } else {
                                    futureMaxDistance = getTheFutureMaxDistance(scheduledArray, room);
                                    futureDWillBe = futureMaxDistance / 1372;
                                }
                                let changeInFutureE: any = Math.abs(futureEWillBe - eSoFar), changeInFutureD: any =
                                    Math.abs(futureDWillBe - dSoFar);
                                if (changeInFutureE > 4 * changeInFutureD) {
                                    if (!roomArrayObject[roomName]) {
                                        roomArrayObject[roomName] = [];
                                    }
                                    roomArrayObject[roomName].push(time);
                                    if (!timeSlotscoursesIDObject[time]) {
                                        timeSlotscoursesIDObject[time] = [];
                                    }
                                    timeSlotscoursesIDObject[time].push(courseID);
                                    scheduledArray.push([room, course, time]), courseFilled = true;
                                    dSoFar = futureDWillBe;
                                    eSoFar = futureEWillBe;
                                    scheduledInputSoFar += courseEnrollmentSize;
                                    maxLengthSoFar = futureMaxDistance;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return scheduledArray;
    }
}

let getTheFutureMaxDistance = function (scheduleArray: any[], room: any) {
    let allTheRooms: any [] = [room];
    for (let roomObj of scheduleArray) {
        if (!allTheRooms.includes(roomObj[0])) {
            allTheRooms.push(roomObj[0]);
        }
    }
    if (allTheRooms.length === 1) {
        return 0;
    }
    if (allTheRooms.length === Infinity) {
        return Infinity;
    }
    let maxDistanceSofar = 0;
    for (let i = 0; i < allTheRooms.length; i++) {
        for (let j = i + 1; j < allTheRooms.length; j++) {
            let firstRoomLat: any  = allTheRooms [i]["rooms_lat"];
            let firstRoomLon: any  = allTheRooms [i]["rooms_lon"];
            let secondRoomLat: any = allTheRooms [j]["rooms_lat"];
            let secondRoomLon: any = allTheRooms [j]["rooms_lon"];
            let R: any = 6371;
            let x1: any = secondRoomLat - firstRoomLat;
            let dLat: any = toRad(x1);
            let x2: any = secondRoomLon - firstRoomLon;
            let dLon: any = toRad(x2);
            let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(firstRoomLat)) * Math.cos(toRad(secondRoomLat)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            let d = R * c * 1000;
            if (maxDistanceSofar <= d) {
                maxDistanceSofar = d;
            }
        }
    }
    return maxDistanceSofar;
};
let toRad = function (par: any) {
    return par * Math.PI / 180;
};

let getTheTotalInputEnrollment = function (sections: any[]) {
    let enrollmentSofar = 0;
    for (let section of sections) {
        enrollmentSofar += section["courses_pass"] + section["courses_fail"] + section["courses_audit"];
    }
    return enrollmentSofar;
};

let sortTheArray = function (sectionsArray: any[]) {
    let sortedArray: any[] = sectionsArray;
    sortedArray.sort(function (firstSection: any, secondSection: any) {
        let firstSectionEnollmentSum: any = firstSection["courses_pass"] + firstSection["courses_fail"]
            + firstSection["courses_audit"];
        let secondSectionEnollmentSum: any = secondSection["courses_pass"] +
            secondSection["courses_fail"] + secondSection["courses_audit"];
        return secondSectionEnollmentSum - firstSectionEnollmentSum;
    });
    return sortedArray;
};


