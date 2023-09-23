// script.js

let width = 30;
let height = 30;

let selectedAction = null;
let startBeltPos = null;
let endBeltPos = null;
let items = [];
let globalCounter = 1;  // Unified counter for all items
let currentAction = null;
let itemsForConnection = [];
let connections = [];

function generateCode() {
    let code = "";
    for (let item of items) {
        code += generateCodeForObjects(item) + "\n";
    }

    // Generate connection code:
    for (let conn of connections) {
        let fromName = getNameForItem(conn.from);
        let toName = getNameForItem(conn.to);
        code += `${fromName}.SetEndpoint(${toName});\n`;
    }

    code += generateHandlersAndEndpoints();

    document.getElementById("codeOutput").value = code.trim();
}

function generateHandlersAndEndpoints() {
    let code = "";
    for (let item of items) {
        let itemName = getNameForItem(item);
        switch (item.type) {
            case "belt":
            case "merger":
            case "splitter":
                code += `baggageHandler.Add(${itemName});\n`;
                break;
            case "endpoint":
                code += `endpoints.Add(${itemName});\n`;
                break;
        }
    }
    return code;
}

function generateCodeForObjects(item) {
    console.log("Generating code for item: ", item); // Debug log
    let code = "";
    switch (item.type) {
        case "belt":
            code = `Belt belt${item.id} = new Belt(new Position(${item.start.row}, ${item.start.col}), new Position(${item.end.row}, ${item.end.col}));`;
            break;
        case "merger":
            code = `Merger merger${item.id} = new Merger(new Position(${item.pos.row}, ${item.pos.col}));`;
            break;
        case "splitter":
            code = `Splitter splitter${item.id} = new Splitter(new Position(${item.pos.row}, ${item.pos.col}));`;
            break;
        case "endpoint":
            code = `BaggageEndpoint endpoint${item.id} = new BaggageEndpoint(new Position(${item.pos.row}, ${item.pos.col}));`;
            break;
    }
    return code;
}

function setupGrid() {
    const grid = document.getElementById("grid");
    for (let i = 0; i < height; i++) {
        const row = document.createElement("tr");
        for (let j = 0; j < width; j++) {
            const cell = document.createElement("td");
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', function() {
                if (currentAction === 'connection') {
                    handleConnection(this);
                } else {
                    onCellClick(this);
                }
            });
            row.appendChild(cell);
        }
        grid.appendChild(row);
    }
}

function selectAction(action) {
    currentAction = action;
    if (action !== 'connection') {
        itemsForConnection = [];  // Reset this array whenever we choose a non-connection action
    }
}

function handleConnection(cell) {
    const item = items[cell.dataset.itemIndex];
    if (!item) {
        alert("Please click on an item to create a connection.");
        return;
    }
    
    // Print debug information about the item:
    console.log(`Selected Item: 
        Type: ${item.type}, 
        Position: ${item.pos ? `(${item.pos.row}, ${item.pos.col})` : `Start (${item.start.row}, ${item.start.col}), End (${item.end.row}, ${item.end.col})`}`);

    itemsForConnection.push(item);

    if (itemsForConnection.length === 2) {
        connections.push({ from: itemsForConnection[0], to: itemsForConnection[1] });
        itemsForConnection = [];  // Reset the array for next connections
    }
}

function getNameForItem(item) {
    switch (item.type) {
        case "belt":
            return `belt${item.id}`;
        case "merger":
            return `merger${item.id}`;
        case "splitter":
            return `splitter${item.id}`;
        case "endpoint":
            return `endpoint${item.id}`;
    }
    return "";
}


function onCellClick(cell) {
    let pos = { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) };
    let item = null;
    console.log("startBeltPost: ", (!startBeltPos));

    switch (currentAction) {
        case "belt":
            if (!startBeltPos) {
                startBeltPos = { ...pos }; 
                console.log("Setting startBeltPos: ", startBeltPos); // Debug log
                cell.classList.add("start");
            } else {
                endBeltPos = { ...pos };
                console.log("Setting endBeltPos: ", endBeltPos, ". Start is at ", startBeltPos); // Debug log
                cell.classList.add("end");
                item = { type: "belt", start: startBeltPos, end: endBeltPos, id: globalCounter++ };
                items.push(item);
                cell.dataset.itemIndex = items.indexOf(item);
                drawBelt(startBeltPos, endBeltPos);
                console.log("Added a belt from ", startBeltPos, " to ", endBeltPos); // Debug log
                startBeltPos = null;
            }
            break;
        case "merger":
            cell.classList.add("merger");
            item = { type: "merger", pos: pos, id: globalCounter++ };
            items.push(item);
            cell.dataset.itemIndex = items.indexOf(item);
            break;
        case "splitter":
            cell.classList.add("splitter");
            item = { type: "splitter", pos: pos, id: globalCounter++ };
            items.push(item);
            cell.dataset.itemIndex = items.indexOf(item);
            break;
        case "endpoint":
            cell.classList.add("endpoint");
            item = { type: "endpoint", pos: pos, id: globalCounter++ };
            items.push(item);
            cell.dataset.itemIndex = items.indexOf(item);
            break;
        case "delete":
            // Remove associated connections
            const itemIndex = cell.dataset.itemIndex;
            if(itemIndex !== undefined) {
                connections = connections.filter(conn => conn.from !== items[itemIndex] && conn.to !== items[itemIndex]);
            }

            // Remove the class and the item from the `items` array
            const classes = ["start", "end", "merger", "splitter", "endpoint", "belt"];
            classes.forEach(cls => cell.classList.remove(cls));
            if(itemIndex !== undefined) {
                items.splice(itemIndex, 1);
                delete cell.dataset.itemIndex;
            }
            break;
    }
}


function drawBelt(originalStart, originalEnd) {

    // Make a copy of the start and end positions
    let start = { ...originalStart };
    let end = { ...originalEnd };

    const grid = document.getElementById("grid");
    let dx = Math.abs(end.col - start.col);
    let dy = Math.abs(end.row - start.row);
    let sx = (start.col < end.col) ? 1 : -1;
    let sy = (start.row < end.row) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        const cell = grid.rows[start.row].cells[start.col];
        cell.classList.add("belt");  // you may need to add a .belt class in styles with gray background

        if (start.row === end.row && start.col === end.col) break;
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            start.col += sx;
        }
        if (e2 < dx) {
            err += dx;
            start.row += sy;
        }
    }
}

// Placeholder function for generating the code
function displayGeneratedCode() {
    // Code generation will be implemented in the next steps
    console.log("Code generation logic to be implemented");
}

