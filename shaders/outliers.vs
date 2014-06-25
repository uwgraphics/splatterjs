uniform sampler2D jfa;
uniform float gridSize;
uniform vec2 resolution;
uniform vec2 offset;

attribute vec3 position;

varying vec4 vColor;

void main() {
	vec4 thisPos = gl_ModelViewProjectionMatrix * vec4(position.xy, 0.0, 1.0);
	vec2 coord = thisPos.xy * 0.5 + 0.5;
	
	// condition for discarding point
	// distance from the thresholded region (don't draw points within the thresholded region)
	float dist = texture2D(jfa, coord).r;
	float clip = dist < (gridSize / 2.0) ? 0.0 : 1.0;
	
	// get the grid coordinates of this particular point, and convert to clip-space coordinates
	vec2 c = floor((coord + offset) * resolution / gridSize);
	c = 2.0 * (c / resolution) - 1.0;
	
	gl_Position = vec4(c, mod(position.z, 1.0), clip);
	gl_PointSize = 1.0;
	vColor = vec4(coord, 0.0, 1.0);
}
