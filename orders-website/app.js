const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const HTTP_PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static("./public/"));

const handlebars = require('handlebars');

handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

// Connect to MongoDB Atlas
const CONNECTION_STRING = "mongodb+srv://dbUser:Rnn2xtWE1iI2F7GO@cluster0.mj9hfv0.mongodb.net/Food_Delivery_Project?retryWrites=true&w=majority";
mongoose.connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// Define Order schema
const Schema = mongoose.Schema;
const orderSchema = new Schema({
    customerName: {
        type: String,
        required: true,
    },
    deliveryAddress: {
        type: String,
        required: true,
    },
    itemsOrdered: {
        type: [String],
        required: true,
    },
    orderTotal: {
        type: String,
    },
    orderDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    driverName: {
        type: String,
    },
    licensePlate: {
        type: String,
    },
    proofOfDelivery: {
        type: String, // photo URL
    },
});

const Order = mongoose.model("orders_collection", orderSchema);

app.use(bodyParser.urlencoded({ extended: false }));

app.engine('.hbs', exphbs.engine({ extname: '.hbs' }));
app.set('view engine', '.hbs');

// Routes

// List of orders
app.get("/", async (req, res) => {
    try {
        // Retrieve DB documents and sort them by orderDate in descending order
        const results = await Order.find().sort({ orderDate: -1 }).lean().exec();
        console.log(results)

        if (results.length === 0) {
            return res.send("ERROR: No courses in database")
        }

        // display results
        return res.render("orders", { layout: false, orders: results })

    } catch (err) {
        console.log(err);
    }
})

//update the status of an order
app.post('/update-status', async (req, res) => {
    const { orderId, status } = req.body;

    try {
        const orderToUpdate = await Order.findById(orderId);

        if (orderToUpdate) {
            if (['RECEIVED', 'READY FOR DELIVERY', 'IN TRANSIT', 'DELIVERED'].includes(status)) {
                orderToUpdate.status = status;
                await orderToUpdate.save();
                res.redirect('/');
            } else {
                res.send('Invalid status');
            }
        } else {
            res.send('Order not found');
        }
    } catch (err) {
        console.log(err);
    }
});

//searching a customer
app.get("/search", async (req, res) => {
    const customerName = req.query.customerName; // Get the customer name from the query string

    try {
        // Query the database to find orders with a matching customerName form the search
        const results = await Order.find({ customerName }).lean().exec();

        if (results.length === 0) {
            return res.send(`No orders found for customer: ${customerName}`);
        }

        return res.render("orders", { layout: false, orders: results });
    } catch (err) {
        console.log(err);
    }
});

// Start the server
const onHttpStart = () => {
    console.log("The web server has started...");
    console.log(`Server is listening on port ${HTTP_PORT}`);
    console.log("Press CTRL+C to stop the server.");
};

app.listen(HTTP_PORT, onHttpStart);