//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

const databaseName = "todolistDB";
const mongodbConnectionString = "mongodb+srv://divyamkumarp:zdH0g6S6pScisqSj@cluster0.m9jsvbr.mongodb.net/" + databaseName;

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));


// Create Schema
const itemsSchema = {
  name: String
};

const listSchema = {
  name: String,
  items: [itemsSchema]
};

// Create Model
const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listSchema);

// Create Documents
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultArr = [item1, item2, item3];

var items = [];

async function getList() {
  // Connect to MongoDB
  // console.log("Connecting to MongoDB...");
  await mongoose.connect(mongodbConnectionString, {family: 4});
  // console.log("Connected to MongoDB");

  var docCount = 0;
  await Item.countDocuments().then((count) => {
    docCount = count;
    // console.log("Document count: " + docCount);
  });

  if (docCount === 0) {
    await Item.insertMany(defaultArr);
  } else {
    console.log("Items array length: " + items.length);
    items = [];
    await Item.find().then(function (foundItems) {
      // console.log(foundItems);
      foundItems.forEach((element) => {
        items.push(element);
        // console.log(element);
      });
      // console.log(items);
    });
  }
  // console.log("Closing MongoDB connection...");
  await mongoose.connection.close();
}

async function addNewItem(itemName, listName) {
  // Connect to MongoDB
  // console.log("Connecting to MongoDB...");
  await mongoose.connect(mongodbConnectionString, {family: 4});
  // console.log("Connected to MongoDB");

  const item = new Item({
    name: itemName
  });

  if (listName === date.getDate()) {
    await item.save();
  } else {
    await List.findOne({name: listName}).then(async (foundList) => {
      foundList.items.push(item);
      await foundList.save();
    });
  }
  await mongoose.connection.close();
}

app.get("/", async function (req, res) {
  const day = date.getDate();
  await getList();

  res.render("list", {listTitle: day, newListItems: items});
});

app.post("/", async function (req, res) {
  const item = req.body.newItem;
  const listName = req.body.list;

  items.push(item);
  console.log(item + " added to list from app.post('/')");
  // console.log("line 107" + items);
  await addNewItem(item, listName);
  if (listName === date.getDate()) {
    res.redirect("/");
  }
  else {
    res.redirect("/" + listName);
  }

});

app.post("/delete", async function (req, res) {
  console.log(req.body.checkbox);

  await mongoose.connect(mongodbConnectionString, {family: 4});
  const id = req.body.checkbox;
  const listName = req.body.listName;
  // console.log(listName, "line 127")

  if (listName === date.getDate()) {
    await Item.deleteOne({_id: id}).then(() => {
      // console.log("Deleted item with id: " + id);
    });
  } else {
    await List.findOneAndUpdate(
      {name: listName},
      {
        $pull: {items: {_id: id}}
      }
    );
  }

  items = [];
  await mongoose.connection.close();
  if (listName === date.getDate()) {
    res.redirect("/");
  } else {
    // console.log("Redirecting to " + listName);
    res.redirect("/" + listName);
  }
});

app.get("/:customListName", async function (req, res) {
  await mongoose.connect(mongodbConnectionString, {family: 4});

  const customListName = _.capitalize(req.params.customListName);
  // console.log(customListName);

  await List.findOne({name: customListName}).then(async (foundList) => {
    if (!foundList) {
      // console.log("Doesn't exist");
      const list = new List({
        name: customListName,
        items: defaultArr
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      // console.log("Exists");
      res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
    }
  });

  await mongoose.connection.close();
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(process.env.PORT ||3000, function () {
  console.log("Server started on port 3000");
});
