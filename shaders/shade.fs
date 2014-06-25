uniform sampler2D texture;
uniform sampler2D distances;
uniform sampler2D maxTex;
uniform sampler2D outliers;
uniform vec2 delta;
uniform vec3 rgbColor;
uniform float lowerLimit;
uniform float upperLimit;

varying vec2 coord;

float f(float n, float eps, float k){
    if(n > eps){
		return pow(n, 1.0/3.0);
	}else{
	    return (k * n + 16.0) / 116.0;
	}    
}
vec3 XYZtoLRGB(vec3 xyz, bool clamp){
	vec3 M0 = vec3( 3.2404542, -1.5371385, -0.4985314);
	vec3 M1 = vec3(-0.9692660,  1.8760108,  0.0415560);
	vec3 M2 = vec3( 0.0556434, -0.2040259,  1.0572252);

    float r = dot(xyz, M0);
    float g = dot(xyz, M1);
    float b = dot(xyz, M2);

    if(clamp){
        r = min(max(r, 0.0), 1.0);
        g = min(max(g, 0.0), 1.0);
        b = min(max(b, 0.0), 1.0);
    }
		
	return vec3(r,g,b);
}
vec3 LRGBtoXYZ(vec3 lrgb){
	vec3 M0 = vec3(0.4124564, 0.3575761, 0.1804375);
	vec3 M1 = vec3(0.2126729, 0.7151522, 0.0721750);
	vec3 M2 = vec3(0.0193339, 0.1191920, 0.9503041);
		  
	return  vec3(dot(lrgb, M0), dot(lrgb, M1), dot(lrgb, M2));
}
vec3 XYZtoLAB(vec3 xyz){
	float Xr = 0.95047;
    float Yr = 1.0;
	float Zr = 1.08883;

	float eps = 216.0 / 24389.0;
	float k = 24389.0 / 27.0;
		  
	float xr = xyz.x / Xr;
	float yr = xyz.y / Yr;
	float zr = xyz.z / Zr;

	xr = f(xr, eps, k);
	yr = f(yr, eps, k);
	zr = f(zr, eps, k);

	float L = 116.0 * yr - 16.0;
	float a = 500.0 * (xr - yr);
	float b = 200.0 * (yr - zr);

	return vec3(L,a,b);
}
vec3 LABtoXYZ(vec3 lab){
	float Xr = 0.95047;
	float Yr = 1.0;
	float Zr = 1.08883;
		
	float eps = 216.0 / 24389.0;
	float k = 24389.0 / 27.0;

	float L = lab.x;
	float a = lab.y;
	float b = lab.z;

	float fy  = (L + 16.0) / 116.0;
	float fx  = a / 500.0 + fy;
	float fz  = -b / 200.0 + fy;

	float xr = ((pow(fx, 3.0) > eps) ? pow(fx, 3.0) : (116.0 * fx - 16.0) / k);
	float yr = ((L > (k * eps)) ? pow(((L + 16.0) / 116.0), 3.0) : L / k);
	float zr = ((pow(fz, 3.0) > eps) ? pow(fz, 3.0) : (116.0 * fz - 16.0) / k);

	float X = xr * Xr;
	float Y = yr * Yr;
	float Z = zr * Zr;

	return vec3(X,Y,Z);
}
vec3 LABtoLCH(vec3 lab){
	float l = lab.x;
	float a = lab.y;
	float b = lab.z;
		
	float C = sqrt(a*a + b*b);
	float H = atan(b,a);

    return vec3(l,C,H);
}
vec3 LCHtoLAB(vec3 lch){
	float l = lch.x;
	float c = lch.y;
	float h = lch.z;
		
	return vec3(l, c*cos(h), c*sin(h));
}
vec3 RGBtoLAB(vec3 rgb){
	return  XYZtoLAB(LRGBtoXYZ(rgb));
}
vec3 LABtoRGB(vec3 lab, bool clamp){
	return XYZtoLRGB(LABtoXYZ(lab),clamp);
}

void main() {
	// vec2 texCoords = coord + vec2(0.5) * delta;
	float w = texture2D(texture, coord).r;
	float dist = texture2D(distances, coord).r;
	
	float maxVal = texture2D(maxTex, vec2(0.0)).r;
	float wf = w / maxVal;
	float a = wf > lowerLimit ? wf : 0.0;
	
	vec3 lab = RGBtoLAB(rgbColor);
	vec3 lch = LABtoLCH(lab);
	
	// draw outlier points
	float outlier = texture2D(outliers, coord).r;
	if (outlier > 0.0) {
		a = 1000.0;
	} else if ((dist > 0.0) && (dist < 3.0)) {
		lch.x *= 0.95;
		lch.y *= 0.95;
		a = 1000.0;
	} else {
		if (wf >= upperLimit) {
			wf = 1.0;
			a = 1.0;
		} else {
			wf = wf/upperLimit;
		}
		
		lch.x = lch.x * wf + (1.0 - wf) * 100.0;
		lch.y = lch.y * wf;
	}
	
	
	vec3 ret = LABtoRGB(LCHtoLAB(lch), true);
	gl_FragColor = vec4(ret.xyz, a);
}