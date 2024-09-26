const fs = require('fs');
const path = require('path');

const getChromiumProfiles = (filePath, browserName) => {
    if (!fs.existsSync(filePath)) return [];
    const dirs = fs.readdirSync(filePath);
    return dirs.reduce((profiles, dir) => {
        if (dir.includes("Profile") || dir === "Default") {
            profiles.push({
                name: browserName,
                profile: dir,
                path: path.join(filePath, dir),
            });
        }
        return profiles;
    }, []);
};

const getGeckoProfiles = (filePath, browserName) => {
    if (!fs.existsSync(filePath)) return [];
    const dirs = fs.readdirSync(filePath);
    return dirs.reduce((profiles, dir) => {
        if (dir.includes(".default-release") || dir.includes(".default-default-")) {
            profiles.push({
                name: browserName,
                profile: dir,
                path: path.join(filePath, dir),
            });
        }
        return profiles;
    }, []);
};

module.exports = {
    getChromiumProfiles,
    getGeckoProfiles
}