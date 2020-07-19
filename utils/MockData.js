const fs = require("fs");

var MockData = function(mockServerName,  mockDataHome) {
	
	var mockData = this;
	mockData.mappingFileTimestampMap = {};
	mockData.jsonMappingMap = {};
	mockData.defaultMappingMap = {};
	mockData.mockDataHome = mockDataHome;
	mockData.mockServerName = mockServerName;
	console.debug("mockDataHome="+ this.mockDataHome);
	console.debug("mockServerName="+ this.mockServerName);
	mockData.loadAllMappingFiles();
	mockData.generateDefaultMapping();
	mockData.loadAlternateResponseFiles();
	
	mockData.printJsonMappingMap();
	
	return mockData;
};


MockData.prototype.findFilePath = function(pathInfo, flow, scenario) {
	
	console.debug("pathInfo:" + pathInfo + " flow:" + flow + " scenario:" + scenario);
	var jsonOrXmlFile;
	var responseFile;
	var fileExists;
	
	//user does not select flow/scenario
	if (null == flow) {
		jsonOrXmlFile = findMatchingFile(defaultMappingMap, pathInfo);
		responseFile = this.getServerServiceVirtualizationDataPath() + "/" + jsonOrXmlFile;
		fileExists = fs.statSync(responseFile).isFile();
		console.debug("responseFile:" + responseFile + " exists? " + fileExists);
		
		return responseFile;
	}
	
	//user does select flow/scenario
	jsonOrXmlFile =  findMatchingFile(this.jsonMappingMap[flow], pathInfo);
	responseFile = this.getServerServiceVirtualizationDataPath() + "/" + flow + "/" + scenario + "/" + jsonOrXmlFile;
	fileExists = fs.statSync(responseFile).isFile();
	
	if (!fileExists) {
		//try find response file from the default scenario of this flow
		responseFile = this.getServerServiceVirtualizationDataPath() + "/" + flow + "/default/" + jsonOrXmlFile;
		fileExists = fs.statSync(responseFile).isFile();
	}
	
	if (!fileExists) {
		//try find response file from the default scenario
		jsonOrXmlFile = findMatchingFile(defaultMappingMap, pathInfo);
		responseFile = this.getServerServiceVirtualizationDataPath() + "/" + jsonOrXmlFile;
		fileExists = fs.statSync(responseFile).isFile();
	}

	console.debug("responseFile:" + responseFile + " exists? " + fileExists);
	
	return responseFile;
}

MockData.prototype.findMatchingFile = function(map, pathInfo) {
	
	var matchingFile = map.get(pathInfo);
	
	if (null == matchingFile) {
		//try pattern matching
		var matched = false;
		
		for (pattern in map) {
			matched = pathInfo.match(pattern);
			
			if(matched) {
				matchingFile = map[pattern];
				break;
			}
		}
	}
	
	return matchingFile;
}

MockData.prototype. getAlternateResponseFiles = function() {
	return this.alternateResponseFiles;
}

MockData.prototype.loadAllMappingFiles = function() {
	
	//entry-mapping.json
	var entryMappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/entry-mapping.json", 'utf8');
	
	var mappingFileFolders;
	var entryMapping = null;
	
	entryMapping = JSON.parse(entryMappingFile);
	entryPageUrl = entryMapping['entryPageUrl'];
	mappingFileFolders = entryMapping['flows'];
	
	console.debug("Entry Mapping file:");
	this.printJsonMappingFile(entryMapping);
	
	for (flow of mappingFileFolders) {
		console.debug("flow=" + flow['flow']);
		this.initMappings(flow['flow']);
	}
}

MockData.prototype.generateDefaultMapping = function() {
	//"default" folder in each flow contains all response files of happy scenario.
	//response files in a specific scenario folder only overrides some of those from the "default" folder
	
	var path;
	var map;
	
	for (folderPath in this.jsonMappingMap) {
		map =  this.jsonMappingMap[folderPath];
		for (pathInfo in map) {
			path = folderPath + "/default/" + map[pathInfo];
			if (pathInfo in this.defaultMappingMap) {
				console.debug(pathInfo + " alrady exists and is mapped to " + this.defaultMappingMap[pathInfo]);
			}
			this.defaultMappingMap[pathInfo] = path;
		}
	}
}

MockData.prototype.loadAlternateResponseFiles = function() {
	//alternateResponseFiles.json contains the array of the request pathInfo. Their corresponding response files have a second version,
	//to be served alternately.
	var mappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/alternateResponseFiles.json", 'utf8');
	
	this.alternateResponseFiles = JSON.parse(mappingFile);

}

MockData.prototype. getMockServerRelativePath = function() {
	return this.mockServerName + "/";
}

MockData.prototype.getMockServerAbsolutePath = function() {
	return "/" + this.getMockServerRelativePath();
}

MockData.prototype.initMappings = function(folderPath) {
	
	//mapping file is always foldername-mapping.json
	var foldername = folderPath.substring(folderPath.lastIndexOf("/") + 1);
	var filePath = this.getServerServiceVirtualizationDataPath() + "/" + folderPath + "/" + foldername + "-mapping.json";
	var mappingFile = fs.readFileSync(filePath, 'utf8');
	var timestamp = this.mappingFileTimestampMap[folderPath];
	var stats = fs.statSync(filePath);
	var lastModified = stats.mtime;
	
	if (null == timestamp || timestamp < lastModified) {
		this.mappingFileTimestampMap[folderPath] = lastModified;
		var mapping = JSON.parse(mappingFile);
		this.jsonMappingMap[folderPath] = mapping;
	}
	
}

MockData.prototype.loadFlowScenarios = function() {
	
	var mappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/flow-scenarios.json", 'utf8');
	
	var flowScenariosMap = null;
	
	flowScenariosMap = JSON.parse(mappingFile);
	
	return flowScenariosMap;
}

MockData.prototype.getEntryPageUrl = function() {
	return this.entryPageUrl;
}

MockData.prototype.getServerServiceVirtualizationDataPath = function() {

	return this.mockDataHome + "/" + this.mockServerName;
}

MockData.prototype.printJsonMappingMap = function() {
	
	console.debug("jsonMappingMap:" + this.jsonMappingMap);
	
	this.printJsonMappingFile(this.jsonMappingMap)
}

MockData.prototype.printJsonMappingFile = function(file) {

	var indented = JSON.stringify(file, null, '\t')
	
	console.debug(indented);
}

module.exports = MockData;