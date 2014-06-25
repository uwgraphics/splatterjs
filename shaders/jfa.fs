uniform sampler2D texture;
uniform float kStep;
uniform vec2 delta;

varying vec2 coord;

vec3 calcMin(vec3 curMin, vec2 coordsToQuery) {
	// do a check for out-of-bounds queries
	if (coordsToQuery.x < 0.0 || coordsToQuery.x > 1.0 || coordsToQuery.y < 0.0 || coordsToQuery.y > 1.0) {
		return curMin;
	}

	vec3 query = texture2D(texture, coordsToQuery).xyz;
	
	// do a check for out-of-bounds queries
	if (query.y < 0.0 || query.y > 1.0 || query.z < 0.0 || query.z > 1.0) {
		return curMin;
	}	
	
	float dist = distance(coord / delta, query.yz / delta);
	if (dist < curMin.x) {
		return vec3(dist, query.yz);
	} else {
		return curMin;
	}
}

void main() {
	vec3 minVal = texture2D(texture, coord).xyz;
	
	minVal = calcMin(minVal, vec2(coord.x + kStep * delta.x, coord.y + kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x + kStep * delta.x, coord.y - kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x - kStep * delta.x, coord.y + kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x - kStep * delta.x, coord.y - kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x,                   coord.y + kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x,                   coord.y - kStep * delta.y));
	minVal = calcMin(minVal, vec2(coord.x + kStep * delta.x, coord.y                  ));
	minVal = calcMin(minVal, vec2(coord.x - kStep * delta.x, coord.y                  ));
	
	vec4 color = vec4(minVal.xyz, 1.0);
	gl_FragColor = color;
}