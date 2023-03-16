const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const format = require("date-fns/format");
const isValidDate = require("date-fns/isValid");

const path = require("path");

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Runs at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initDBAndServer();

const verifyQuerys = (req, res, next) => {
  const { post, put } = req.route.methods;

  if (post === true || put === true) {
    var { id, todo, priority, status, category, dueDate } = req.body;
  } else {
    var { priority, status, category, date, search_q } = req.query;
  }

  const priorityArr = ["HIGH", "MEDIUM", "LOW"];
  const statusArr = ["TO DO", "IN PROGRESS", "DONE"];
  const categoryArr = ["WORK", "HOME", "LEARNING"];
  let msg;
  let queryCondations = ``;

  if (priority !== undefined) {
    if (priorityArr.includes(priority)) {
      queryCondations += `priority='${priority}' and `;
      msg = "Priority Updated";
    } else {
      res.status(400);
      res.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    if (statusArr.includes(status)) {
      queryCondations += `status='${status}' and `;
      msg = "Status Updated";
    } else {
      res.status(400);
      res.send("Invalid Todo Status");
      return;
    }
  }

  if (category !== undefined) {
    if (categoryArr.includes(category)) {
      queryCondations += `category='${category}' and `;
      msg = "Category Updated";
    } else {
      res.status(400);
      res.send("Invalid Todo Category");
      return;
    }
  }

  if (search_q !== undefined) {
    queryCondations += `todo LIKE '%${search_q}%' and `;
  }
  if (dueDate !== undefined) {
    if (new Date(dueDate) != "Invalid Date") {
      queryCondations += `due_date='${format(
        new Date(dueDate),
        "yyyy-MM-dd"
      )}'`;
      msg = "Due Date Updated";
    } else {
      res.status(400);
      res.send("Invalid Due Date");
      return;
    }
  }
  if (date !== undefined) {
    if (new Date(date) != "Invalid Date") {
      queryCondations += `due_date='${format(new Date(date), "yyyy-MM-dd")}'`;
    } else {
      res.status(400);
      res.send("Invalid Due Date");
      return;
    }
  }

  if (todo !== undefined) {
    queryCondations += `todo='${todo}'`;
    msg = "Todo Updated";
  }

  req.variable = queryCondations;
  req.msg = msg;
  next();
};

app.get("/todos/", verifyQuerys, async (req, res) => {
  const queryCondation = req.variable;

  let getTodosQuery = `SELECT id,todo,category,priority,status,due_date AS dueDate FROM todo WHERE ${queryCondation}`;

  getTodosQuery = getTodosQuery.substring(0, getTodosQuery.length - 4) + " ;";

  const todos = await db.all(getTodosQuery);

  res.send(todos);
});

app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;

  const getTodoQuery = `SELECT id,todo,category,priority,status,due_date AS dueDate FROM todo WHERE id=${todoId};`;

  const todo = await db.get(getTodoQuery);

  res.send(todo);
});

app.get("/agenda/", verifyQuerys, async (req, res) => {
  const queryCondation = req.variable;

  const getTodosQuery = `SELECT id,todo,category,priority,status,due_date AS dueDate FROM todo WHERE ${queryCondation};`;

  const todos = await db.all(getTodosQuery);
  res.send(todos);
});

app.post("/todos/", verifyQuerys, async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;

  const addTodoQuery = `
    INSERT INTO 
            todo (id, todo, priority, status, category, due_date)
        VALUES
            (
                ${id},
               '${todo}',
               '${priority}',
               '${status}',
               '${category}',
               ${dueDate}
            );`;

  await db.run(addTodoQuery);

  res.send("Todo Successfully Added");

  //   const addTodoQuery = `INSERT INTO
  //   todo (id,todo,priority,status,category,due_date)
  //   VALUES
  //   (
  //      ${id},
  //     '${todo}',
  //     '${priority}',
  //     '${status}',
  //     '${category}',
  //     '${dueDate}'
  //   );`;

  //   await db.run(addTodoQuery);

  //   res.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", verifyQuerys, async (req, res) => {
  const resMsg = req.msg;
  const { todoId } = req.params;
  let queryCondations = req.variable;
  queryCondations = queryCondations.replace("and", "");

  let updateTodosQuery = `UPDATE todo SET ${queryCondations} WHERE id=${todoId};`;

  await db.run(updateTodosQuery);

  res.send(resMsg);
});

app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;

  const deleteTodoQuery = `DELETE FROM todo WHERE id=${todoId};`;

  await db.run(deleteTodoQuery);

  res.send("Todo Deleted");
});

module.exports = app;
