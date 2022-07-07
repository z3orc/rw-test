const express = require("express");
const morgan = require("morgan");
const { param, validationResult } = require("express-validator");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server online 🚀");
});

app.use(helmet());
app.use(morgan("combined"));

const paper = {
    getVersion: async (url, version) => {
        const json = await getJson(url);
        var length = json.response.versions.length;
        var versions = json.response.versions;
        for (var i = 0; i < length; i++) {
            if (versions[i] == version) {
                return { id: versions[i], exists: true };
            }
        }
        return { exists: false };
    },
    getBuild: async (url) => {
        const json = await getJson(url);
        var builds = json.response.builds;
        var latestBuild = builds[builds.length - 1];
        return latestBuild;
    },
    getJar: async (url) => {
        const json = await getJson(url);
        var downloads = json.response.downloads;
        var jar = downloads.application.name;
        return jar;
    },
    getUrl: async (version) => {
        const endpoint = "https://papermc.io/api/v2/projects/paper";
        var url = endpoint;
        var verInfo = await paper.getVersion(url, version);
        var build;
        var jar;

        if (verInfo.exists == true) {
            url = url + "/versions/" + verInfo.id;
            build = await paper.getBuild(url);
        } else {
            return false;
        }
        url = url + "/builds/" + build;
        jar = await paper.getJar(url);

        return url + "/downloads/" + jar;
    },
};

const vanilla = {
    getVersion: async (url, version) => {
        const json = await getJson(url);
        var length = json.response.versions.length;
        var versions = json.response.versions;
        var returnArr = [];
        for (var i = 0; i < length; i++) {
            if (versions[i].id == version) {
                returnArr.push(true);
                returnArr.push(versions[i].url);
                return { exists: true, url: versions[i].url, id: versions[i].id };
            }
        }
        returnArr.push(false);
        return returnArr;
    },
    getJar: async (url) => {
        const json = await getJson(url);
        return json.response.downloads.server.url;
    },
    getUrl: async (version) => {
        const endpoint = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
        var verInfo = await vanilla.getVersion(endpoint, version);
        var jar;
        var url;

        if (verInfo.exists == true) {
            jar = await vanilla.getJar(verInfo.url);
        } else {
            return false;
        }
        url = jar;

        return url;
    },
};

const purpur = {
    getVersion: async (url, version) => {
        const json = await getJson(url);
        var length = json.response.versions.length;
        var versions = json.response.versions;
        for (var i = 0; i < length; i++) {
            if (versions[i] == version) {
                return { id: versions[i], exists: true };
            }
        }
        return { exists: false };
    },
    getBuild: async (url) => {
        const json = await getJson(url);
        var builds = json.response.builds.latest;
        var latestBuild = builds;
        return latestBuild;
    },
    getUrl: async (version) => {
        const endpoint = "https://api.purpurmc.org/v2/purpur";
        var url = endpoint;
        var verInfo = await purpur.getVersion(url, version);
        var build;

        if (verInfo.exists == true) {
            url = url + "/" + verInfo.id;
            console.log(url);
            build = await purpur.getBuild(url);
        } else {
            return false;
        }
        url = url + "/" + build;

        return url + "/download";
    },
};

async function getJson(yUrl) {
    return fetch(yUrl, { mode: "cors" })
        .then((response) => response.json())
        .then(function (response) {
            return { response };
        })
        .catch(function (error) {
            throw error;
        });
}

const blacklist = ",;:-_'*^¨~`´+?}][{/()=&%¤#!§|<><";

app.get(
    ["/v1/:flavour/:version", "/:flavour/:version"],
    param("flavour").isAlpha().isLength({ max: 8 }).escape().blacklist(blacklist).stripLow(),
    param("version").isAscii().isLength({ max: 7 }).escape().blacklist(blacklist).stripLow(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        var params = req.params;
        var version = params.version;
        var flavour = params.flavour;
        var download;

        if (flavour == "paper") {
            download = paper.getUrl(version);
        } else if (flavour == "vanilla") {
            download = vanilla.getUrl(version);
        } else if (flavour == "purpur") {
            download = purpur.getUrl(version);
        } else {
            return res.status(404).send();
        }

        download
            .then((url) => {
                if (url == false) {
                    return res.status(404).send();
                } else {
                    return res.status(302).redirect(url);
                }
            })
            .catch((error) => {
                res.status(500).send();
                console.log(error);
            });
    }
);

//Static routes

app.use(express.static(`${__dirname}../../public`));

app.get("/", (req, res) => {
    res.sendFile(`${__dirname}../../public/index.html`);
});

app.get("/about", (req, res) => {
    res.sendFile(`${__dirname}/../../public/about.html`);
});
