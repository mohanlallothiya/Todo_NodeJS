const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");
const app = express();
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const statusCheck = (status) => {
  if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

const priorityCheck = (priority) => {
  if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

const categoryCheck = (category) => {
  if (category !== undefined) {
    if (category === "WORK" || category === "HOME" || category === "LEARNING") {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};
const dueDateCheck = (dueDate) => {
  if (dueDate !== undefined) {
    if (isValid(new Date(dueDate))) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

const invalidProperties = (requestQuery) => {
  let response = "";
  switch (true) {
    case statusCheck(requestQuery.status):
      response = "Invalid Todo Status";
      break;

    case priorityCheck(requestQuery.priority):
      response = "Invalid Todo Priority";
      break;

    case categoryCheck(requestQuery.category):
      response = "Invalid Todo Category";
      break;

    case dueDateCheck(requestQuery.dueDate):
      response = "Invalid Due Date";
      break;

    default:
      response = "noInvalid";
  }
  return response;
};

const hasPriorityAndStatus = (requestBody) => {
  return requestBody.priority !== undefined && requestBody.status !== undefined;
};

const hasCategoryAndStatus = (requestBody) => {
  return requestBody.category !== undefined && requestBody.status !== undefined;
};

const hasCategoryAndPriority = (requestBody) => {
  return (
    requestBody.category !== undefined && requestBody.priority !== undefined
  );
};

const hasStatus = (requestBody) => {
  return requestBody.status !== undefined;
};

const hasPriority = (requestBody) => {
  return requestBody.priority !== undefined;
};

const hasCategory = (requestBody) => {
  return requestBody.category !== undefined;
};

const hasTodo = (requestBody) => {
  return requestBody.todo !== undefined;
};

const hasDueDate = (requestBody) => {
  return requestBody.dueDate !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q = "" } = request.query;
  if (invalidProperties(request.query) === "noInvalid") {
    let todo = null;
    let getTodoQuery = "";
    switch (true) {
      case hasCategoryAndPriority(request.query):
        getTodoQuery = `
          SELECT id,todo,priority,status,category,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND category='${category}' AND priority='${priority}';`;
        break;
      case hasCategoryAndStatus(request.query):
        getTodoQuery = `
          SELECT id,todo,priority,status,category,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND category='${category}' AND status='${status}';`;
        break;
      case hasPriorityAndStatus(request.query):
        getTodoQuery = `
          SELECT id,todo,priority,category,status,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND priority='${priority}' AND status='${status}';`;
        break;
      case hasCategory(request.query):
        getTodoQuery = `
          SELECT id,todo,priority,status,category,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND category='${category}';`;
        break;
      case hasPriority(request.query):
        getTodoQuery = `
          SELECT id,todo,category,priority,status,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND priority='${priority}';`;
        break;
      case hasStatus(request.query):
        getTodoQuery = `
          SELECT id,todo,priority,status,category,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%' AND status='${status}';`;
        break;
      default:
        getTodoQuery = `
          SELECT id,todo,priority,category,status,due_date AS dueDate
          FROM todo
          WHERE todo LIKE '%${search_q}%';`;
    }
    todo = await db.all(getTodoQuery);
    response.send(todo);
  } else {
    response.status(400);
    response.send(invalidProperties(request.query));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE id=${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isValid(new Date(date))) {
    const formatDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `
    SELECT id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE due_date='${formatDate}';`;
    const todos = await db.all(getTodoQuery);
    response.send(todos);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  if (invalidProperties(todoDetails) === "noInvalid") {
    const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
    const addTodoQuery = `
    INSERT INTO 
        todo(id,todo,category,priority,status,due_date)
    VALUES(
        ${id},
        '${todo}',
        '${category}',
        '${priority}',
        '${status}',
        '${formatDate}');`;
    const newTodo = await db.run(addTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send(invalidProperties(todoDetails));
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;
  if (invalidProperties(todoDetails) === "noInvalid") {
    let updateTodoQuery = "";
    let responseText = "";
    switch (true) {
      case hasCategory(request.body):
        const { category } = todoDetails;
        updateTodoQuery = `
            UPDATE todo
            SET category='${category}'
            WHERE id=${todoId};`;
        responseText = "Category Updated";
        break;
      case hasStatus(request.body):
        const { status } = todoDetails;
        updateTodoQuery = `
            UPDATE todo
            SET status='${status}'
            WHERE id=${todoId};`;
        responseText = "Status Updated";
        break;
      case hasPriority(request.body):
        const { priority } = todoDetails;
        updateTodoQuery = `
            UPDATE todo
            SET priority='${priority}'
            WHERE id=${todoId};`;
        responseText = "Priority Updated";
        break;
      case hasTodo(request.body):
        const { todo } = todoDetails;
        updateTodoQuery = `
            UPDATE todo
            SET todo='${todo}'
            WHERE id=${todoId};`;
        responseText = "Todo Updated";
        break;
      case hasDueDate(request.body):
        const { dueDate } = todoDetails;
        updateTodoQuery = `
            UPDATE todo
            SET due_date='${dueDate}'
            WHERE id=${todoId};`;
        responseText = "Due Date Updated";
        break;
    }
    await db.run(updateTodoQuery);
    response.send(responseText);
  } else {
    response.status(400);
    response.send(invalidProperties(todoDetails));
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE from todo
    WHERE id=${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
