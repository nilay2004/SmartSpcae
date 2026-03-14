{

	"metadata" :
	{
		"formatVersion" : 3,
		"generatedBy"   : "Manual Simple Window",
		"vertices"      : 8,
		"faces"         : 6,
		"normals"       : 0,
		"colors"        : 0,
		"uvs"           : 0,
		"materials"     : 1,
		"morphTargets"  : 0,
		"bones"         : 0
	},

	"scale" : 1.0,

	"materials" : [	{
		"DbgColor" : 15658734,
		"DbgIndex" : 0,
		"DbgName" : "Window_Frame",
		"blending" : "NormalBlending",
		"colorAmbient" : [1.0, 1.0, 1.0],
		"colorDiffuse" : [1.0, 1.0, 1.0],
		"colorSpecular" : [1.0, 1.0, 1.0],
		"shading" : "Phong",
		"specularCoef" : 100,
		"transparency" : 0.5,
		"transparent" : true
	}],

	"vertices" : [
        // A simple rectangular frame/pane (60cm wide, 100cm high, 5cm thick)
        30, 100, 2.5,
        30, 0, 2.5,
        -30, 0, 2.5,
        -30, 100, 2.5,
        30, 100, -2.5,
        30, 0, -2.5,
        -30, 0, -2.5,
        -30, 100, -2.5
    ],

	"faces" : [
        3, 0,3,2,1, 0,
        3, 4,7,6,5, 0,
        3, 0,4,5,1, 0,
        3, 1,5,6,2, 0,
        3, 2,6,7,3, 0,
        3, 4,0,3,7, 0
    ]
}
