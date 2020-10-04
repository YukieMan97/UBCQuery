/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        const xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/query", true);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify(query)); // sends out the query
        xhttp.onload = function (request, event) {
            let response = xhttp.responseText;
            fulfill(JSON.parse(response));
        };
        xhttp.onerror = function (request, event) {
            reject ("request not processed succesfully");
        };
    });
};
