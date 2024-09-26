const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const program = require('../program/program.js');

let drives = [];

const checkDiskUsage = async (rootPath) => {
	return new Promise((resolve, reject) => {
		child_process.exec(`wmic logicaldisk where "DeviceID='${rootPath}'" get FreeSpace,Size /format:value`, (error, stdout) => {
			if (error) {
				return reject(error);
			}

			const result = {};

			stdout.split('\n').forEach(line => {
				if (line.includes('FreeSpace=')) {
					result.free = parseInt(line.split('=')[1]);
				} else if (line.includes('Size=')) {
					result.total = parseInt(line.split('=')[1]);
				}
			});

			result.available = result.total - result.free;
			resolve(result);
		});
	});
};

const getDrives = async (callback) => {
	child_process.exec('wmic logicaldisk get Caption,FreeSpace,Size,VolumeSerialNumber,Description  /format:list', (err, stdout, stderr) => {
		if (err) return callback(err, null);

		let lines = stdout.split('\r\r\n');
		let newline = false;

		let caption = '',
			description = '',
			freeSpace = '',
			size = '',
			volume = '';

		for (let i = 0; i < lines.length; i++) {
			if (lines[i] != '') {
				let tokens = lines[i].split('=');
				switch (tokens[0]) {
					case 'Caption':
						caption = tokens[1];
						newline = true;
						break;
					case 'Description':
						description = tokens[1];
						break;
					case 'FreeSpace':
						freeSpace = tokens[1];
						break;
					case 'Size':
						size = tokens[1];
						break;
					case 'VolumeSerialNumber':
						volume = tokens[1];
						break;
				}
			} else {
				if (newline) {
					size = parseFloat(size);
					if (isNaN(size)) {
						size = 0;
					}

					freeSpace = parseFloat(freeSpace);
					if (isNaN(freeSpace)) {
						freeSpace = 0;
					}

					var used = (size - freeSpace);
					var percent = '0%';

					if (size != '' && parseFloat(size) > 0) {
						percent = Math.round((parseFloat(used) / parseFloat(size)) * 100) + '%';
					}

					drives[drives.length] = {
						filesystem: description,
						blocks: size,
						used: used,
						available: freeSpace,
						capacity: percent,
						mounted: caption
					};

					newline = false;
					caption = '';
					description = '';
					freeSpace = '';
					size = '';
					volume = '';
				}

			}
		}

		if (callback != null) {
			callback(null, drives);
		}

		return drives;
	});
};

const getUsers = async () => {
	if (!(await program.isElevated())) {
		return [os.homedir()];
	};

	return new Promise((resolve, reject) => {
		getDrives((err, drives) => {
			if (err) return reject(err);
			let users = [];
			let drivePromises = drives.map(drive => {
				const mountpoint = drive.mountpoint;
				if (!mountpoint) return Promise.resolve([]);
				const usersDir = path.join(mountpoint, 'Users');
				return new Promise((resolveDir, rejectDir) => {
					fs.readdir(usersDir, { withFileTypes: true }, (err, files) => {
						if (err) return resolveDir([]);
						let userDirs = files
							.filter(file => file.isDirectory())
							.map(file => path.join(usersDir, file.name));

						resolveDir(userDirs);
					});
				});
			});
			Promise.all(drivePromises)
				.then(results => {
					results.forEach(userDirs => users.push(...userDirs));
					if (users.length === 0) {
						const typicalUsersDir = path.join('C:', 'Users');
						if (fs.existsSync(typicalUsersDir)) {
							const files = fs.readdirSync(typicalUsersDir, { withFileTypes: true });
							users = files
								.filter(file => file.isDirectory())
								.map(file => path.join(typicalUsersDir, file.name));
						}
					}
					resolve(users);
				})
				.catch(err => {
					reject(err);
				});
		});
	});
}

module.exports = {
	checkDiskUsage,
	getDrives,
	getUsers,
}