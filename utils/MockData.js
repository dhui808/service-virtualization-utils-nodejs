import fs from 'fs';

class MockData {
	
	mappingFileTimestampMap;
	jsonMappingMap;
	defaultMappingMap;
	alternateResponseFiles;
	entryPageUrl;
	
	constructor(mockServerName,  mockDataHome) {
	
		var mockData = this;
	    mockData.mappingFileTimestampMap = {};
	    mockData.jsonMappingMap = {};
	    mockData.defaultMappingMap = {};
	    mockData.alternateResponseFiles = {};
	    mockData.entryPageUrl = {};
		mockData.mockDataHome = mockDataHome;
		mockData.mockServerName = mockServerName;
		console.debug("mockDataHome="+ this.mockDataHome);
		console.debug("mockServerName="+ this.mockServerName);
		mockData.loadAllMappingFiles();
		mockData.generateDefaultMapping();
		mockData.loadAlternateResponseFiles();
		
		mockData.printJsonMappingMap();
	}

	findFilePath(pathInfo, flow, scenario) {
	
		console.debug("pathInfo:" + pathInfo + " flow:" + flow + " scenario:" + scenario);
		var jsonOrXmlFile;
		var responseFile;
		var fileExists;
		
		//user does not select flow/scenario
		if (null == flow) {
			jsonOrXmlFile = this.findMatchingFile(defaultMappingMap, pathInfo);
			responseFile = this.getServerServiceVirtualizationDataPath() + "/" + jsonOrXmlFile;
			fileExists = this.doesFileExist(responseFile);
			console.debug("responseFile:" + responseFile + " exists? " + fileExists);
			
			return responseFile;
		}
		
		//user does select flow/scenario
		jsonOrXmlFile =  this.findMatchingFile(this.jsonMappingMap[flow], pathInfo);
		responseFile = this.getServerServiceVirtualizationDataPath() + "/" + flow + "/" + scenario + "/" + jsonOrXmlFile;
		fileExists = this.doesFileExist(responseFile);
		
		if (!fileExists) {
			//try find response file from the default scenario of this flow
			responseFile = this.getServerServiceVirtualizationDataPath() + "/" + flow + "/default/" + jsonOrXmlFile;
			fileExists = this.doesFileExist(responseFile);
		}
		
		if (!fileExists) {
			//try find response file from the default scenario
			jsonOrXmlFile = this.findMatchingFile(defaultMappingMap, pathInfo);
			responseFile = this.getServerServiceVirtualizationDataPath() + "/" + jsonOrXmlFile;
			fileExists = this.doesFileExist(responseFile);
		}
	
		console.debug("responseFile:" + responseFile + " exists? " + fileExists);
		
		return responseFile;
	}

	doesFileExist(path) {
		return fs.existsSync(path) && fs.statSync(path).isFile();
	}

	findMatchingFile(map, pathInfo) {
		
		var matchingFile = map[pathInfo];
		
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
	
	 getAlternateResponseFiles() {
		return this.alternateResponseFiles;
	}

	loadAllMappingFiles() {
		
		//entry-mapping.json
		var entryMappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/entry-mapping.json", 'utf8');
		
		var mappingFileFolders;
		var entryMapping = null;
		
		entryMapping = JSON.parse(entryMappingFile);
		this.entryPageUrl = entryMapping['entryPageUrl'];
		mappingFileFolders = entryMapping['flows'];
		
		console.debug("Entry Mapping file:");
		this.printJsonMappingFile(entryMapping);
		
		mappingFileFolders.forEach (flow => {
			console.debug("flow=" + flow['flow']);
			this.initMappings(flow['flow']);
		})
	}

	generateDefaultMapping() {
		//"default" folder in each flow contains all response files of happy scenario.
		//response files in a specific scenario folder only overrides some of those from the "default" folder
		
		var path;
		var map;
		
		Object.keys(this.jsonMappingMap).forEach(folderPath => {
			map =  this.jsonMappingMap[folderPath];
			Object.keys(map).forEach(pathInfo => {
				path = folderPath + "/default/" + map[pathInfo];
				if (pathInfo in this.defaultMappingMap) {
					console.debug(pathInfo + " alrady exists and is mapped to " + this.defaultMappingMap[pathInfo]);
				}
				this.defaultMappingMap[pathInfo] = path;
			})
		})
	}

	loadAlternateResponseFiles() {
		//alternateResponseFiles.json contains the array of the request pathInfo. Their corresponding response files have a second version,
		//to be served alternately.
		var mappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/alternateResponseFiles.json", 'utf8');
		
		this.alternateResponseFiles = JSON.parse(mappingFile);
	
	}
	
	 getMockServerRelativePath() {
		return this.mockServerName + "/";
	}
	
	getMockServerAbsolutePath() {
		return "/" + this.getMockServerRelativePath();
	}

	initMappings(folderPath) {
		
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

	loadFlowScenarios() {
		
		var mappingFile = fs.readFileSync(this.getServerServiceVirtualizationDataPath() + "/flow-scenarios.json", 'utf8');
		
		var flowScenariosMap = null;
		
		flowScenariosMap = JSON.parse(mappingFile);
		
		return flowScenariosMap;
	}
	
	getEntryPageUrl() {
		return this.entryPageUrl;
	}

	getServerServiceVirtualizationDataPath() {
	
		return this.mockDataHome + "/" + this.mockServerName;
	}
	
	printJsonMappingMap() {
		
		console.debug("jsonMappingMap:" + this.jsonMappingMap);
		
		this.printJsonMappingFile(this.jsonMappingMap)
	}

	printJsonMappingFile(file) {
	
		var indented = JSON.stringify(file, null, '\t')
		
		console.debug(indented);
	}
}

export { MockData }
