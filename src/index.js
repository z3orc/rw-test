const express = require("express");
const morgan = require("morgan");
const { param, validationResult } = require("express-validator");
const helmet = require("helmet");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server is running 🚀");
});

app.use(helmet());

app.use(morgan("combined"));

const blacklist = ",;:-_'*^¨~`+?}][{/()=&¤#!§|<><";
const allowList = ["https://papermc.io/api/v2/projects/paper/*", "https://launchermeta.mojang.com/*", "https://api.purpurmc.org/*"];

app.get(
    ["/:flavour/:version/"],
    param("flavour").isAlpha().isLength({ max: 15 }).escape().blacklist(blacklist).stripLow(),
    param("version").isAscii().isLength({ max: 7 }).escape().blacklist(blacklist).stripLow(),
    async (req, res) => {
        const errors = validationResult(req);
        // const client = createClient();
        var client;
        if (!errors.isEmpty()) {
            return res.status(400).send("🔴 Bad Request");
        }

        const dbConnect = async () => {
            client = createClient({ url: process.env.DATABASE_URL });
            const state = await client
                .connect()
                .then(() => {
                    client.on("error", (err) => {
                        console.log(err);
                    });
                    return true;
                })
                .catch(() => {
                    client.discard();
                    return false;
                });
            return state;
        };

        const dbState = await dbConnect();

        if (dbState == true) {
            var params = req.params;
            var version = params.version;
            var flavour = params.flavour;

            //const url = await client.HGET(flavour + ":" + version, "url");
            const url = await client.HGET(flavour, version);

            client.disconnect();

            if (url === null) {
                return res.status(404).send("🔴 Could not find requested item");
            } else {
                return res.status(302).redirect(url);
            }
        } else {
            return res.status(500).send("🔴 Cannot establish database connection");
        }
    }
);

//Static routes

app.use(express.static(`${__dirname}../../public`));

app.get("/", (req, res) => {
    res.sendFile(`${__dirname}../../public/index.html`);
});

app.get("/about", (req, res) => {
    res.sendFile(`${__dirname}../../public/about.html`);
});
