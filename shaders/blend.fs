uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;
uniform sampler2D texture6;
uniform sampler2D texture7;

uniform int N;
uniform float lf;
uniform float cf;

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
	return XYZtoLRGB(LABtoXYZ(lab), clamp);
}

void main()
{
	if(N==0){
		gl_FragColor = texture2D(texture0, coord);
	}else{
		vec4 colors[8];
		colors[0] = texture2D(texture0, coord);
		colors[1] = texture2D(texture1, coord);
		colors[2] = texture2D(texture2, coord);
		colors[3] = texture2D(texture3, coord);
		colors[4] = texture2D(texture4, coord);
		colors[5] = texture2D(texture5, coord);
		colors[6] = texture2D(texture6, coord);
		colors[7] = texture2D(texture7, coord);
    
		float x = 0.0;
		float y = 0.0;
		float z = 0.0;

		float Nf = 0.0;
		float Npf = 0.0;
		bool inshape = false;

		for (int i = 0; i < 8; i++) {
			if (i >= N) break;
			
			vec3 lab = RGBtoLAB(colors[i].xyz);
			if(!inshape) {
				if(colors[i].w >= 1.0) {
					inshape = true;
					x = lab.x * colors[i].w;
					y = lab.y * colors[i].w;
					z = lab.z * colors[i].w;
					Nf = colors[i].w;
					Npf = min(1.0, colors[i].w);
				} else {
					x += lab.x * colors[i].w;
					y += lab.y * colors[i].w;
					z += lab.z * colors[i].w;
					Nf += colors[i].w;
					Npf += min(1.0, colors[i].w);
				}
			} else {
				if(colors[i].w >= 1.0) {
					x += lab.x * colors[i].w;
					y += lab.y * colors[i].w;
					z += lab.z * colors[i].w;
					Nf += colors[i].w;
					Npf += min(1.0, colors[i].w);
				}
			}
		}
		float pf = max(Npf-1.0, 0.0);
		float Cdec = pow(cf, pf);
		float Ldec = pow(lf, pf);
		if(Nf > float(N)) {
			Cdec = 1.0;
			Ldec = 1.0;
		}
		if(Nf <= 0.0) {
			gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);		
		} else {
			vec3 newLab = vec3(x/Nf, y/Nf, z/Nf);
			vec3 newLch = LABtoLCH(newLab);
			newLch.y = newLch.y * Cdec;
			newLch.x = newLch.x * Ldec;

			vec3 ret = LABtoRGB(LCHtoLAB(newLch), true);
			gl_FragColor = vec4(ret.x,ret.y,ret.z,min(1.0, Nf));
		}
	}
}