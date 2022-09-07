const fs = require("fs")
const path = require("path")

const loadDataFromFile = filePath =>
    new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, filePath), "utf-8", (err, data) => {
            if (err) reject(err)
            else {
                resolve(data)
            }
        })
    })

const getAverageResultValue = async (filePath, locationId) => {
    const file = {
        error: null,
        data: null,
        message: null,
    }

    try {
        if (!filePath || !locationId)
            throw Error(
                "FilePath and LocationID are required and cannot be empty"
            )

        file.data = await loadDataFromFile(filePath)

        file.message = "File loaded successfully"
    } catch (e) {
        console.log("There was an error in reading the file")
        file.error = e
        file.message = "There was an error in reading the file"
        console.error(e) // For prod, so that service like Sentry can register it
    }

    if (file.error) return file.message

    const { data } = file

    let tempRowStr = ""
    const dataInRows = []
    let tempRowArr = []

    // Iterates through all the characters of the entire string, and converts the
    // "csv" formatted string to an array of rows (dataInRows)
    // and every row is further broken down into single cell values (stored in tempRowArr)
    // Example: [['a', 'b', 'c'], ['x', 'y', 'z']], where ['a', 'b', 'c'] is the 1st row and ['x', 'y', 'z'] is the 2nd row and so on..
    // This operation takes roughly O(N) in a worst case scenario
    for (let i = 0; i <= data.length; i++) {
        let currentChar = data[i]

        if (currentChar === "\n" || i === data.length) {
            dataInRows.push(tempRowArr)
            tempRowArr = []
            tempRowStr = ""

            if (i < data.length) continue
            else break
        }

        if (currentChar === '"') {
            i++

            while (data[i] !== '"') {
                tempRowStr += data[i]
                i++
            }

            tempRowArr.push(tempRowStr)
            tempRowStr = ""
            i++
            continue
        }

        if (currentChar === ",") {
            tempRowArr.push(tempRowStr)
            tempRowStr = ""
            continue
        }

        tempRowStr += currentChar
    }

    if (!!tempRowArr.length) dataInRows.push(tempRowArr)

    // Now that all the values are stored row-wise in tempRowArr, I am getting
    // the indices of the columns I need to query -
    const headings = dataInRows[0]

    const COLUMN_CHARACTERISTIC_NAME = "CharacteristicName",
        COLUMN_MONITORING_LOCATION_ID = "MonitoringLocationID",
        COLUMN_RESULT_VALUE = "ResultValue"

    const VALUE_CHARACTERISTIC_NAME = "Temperature, water"

    const i_char_name = headings.indexOf(COLUMN_CHARACTERISTIC_NAME),
        i_res_val = headings.indexOf(COLUMN_RESULT_VALUE),
        i_mon_loc_id = headings.indexOf(COLUMN_MONITORING_LOCATION_ID)

    const filteredData = {}
    let resultValuesCount = 0,
        netResultValue = 0

    // Now that I know the column numbers that I need to query on,
    // I am using those indices to calculate the final result
    // This operation also takes O(n) in a worst case scenario
    dataInRows.forEach((row, i) => {
        if (
            i > 0 &&
            row[i_mon_loc_id] === locationId &&
            row[i_char_name] === VALUE_CHARACTERISTIC_NAME
        ) {
            // The line below is just for logging purpose
            filteredData[i] = [
                row[i_mon_loc_id],
                row[i_char_name],
                row[i_res_val],
            ]

            // Storing the results
            netResultValue += Number(row[i_res_val].trim())
            resultValuesCount++
        }
    })

    // UNCOMMENT THESE TO SEE THE ACTUAL FILTERED RESULTS
    // console.log(filteredData)
    // console.log("Total result value: " + netResultValue)
    // console.log("Total entries found: " + resultValuesCount)

    return netResultValue / resultValuesCount
}

// Running the code from here. The total time complexity is 2 x O(n), which is ~O(n)
// Please look at the comments in the above code
const run = async () => {
    const CSV_FILEPATH = "data.csv",
        // Change location_id here to see different results
        MONITORING_LOCATION_ID = "IBP1"

    const output = `The average resultValue for the monitoringLocationId ${MONITORING_LOCATION_ID} is ${await getAverageResultValue(
        CSV_FILEPATH,
        MONITORING_LOCATION_ID
    )}`

    console.log(output)
}

run()
