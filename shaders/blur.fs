#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texture;
uniform int kWindow;
uniform float sigma;
uniform vec2 offset;

void main()
{
	vec4 color = vec4(0.0,0.0,0.0,1.0);
	float sum = 0.0;
	float gW = 0.0;
	float xOff = 0.0;
	float yOff = 0.0;
	for( int i = -kWindow; i <= kWindow; i++ )
	{
		gW = exp(-(float(i*i))/(2.0*sigma*sigma));
		sum += gW;
		xOff = offset.x*float(i);	
		yOff = offset.y*float(i);
	
		color += texelFetch( texture, ivec2(gl_FragCoord.x + xOff, gl_FragCoord.y + yOff),0)*gW;
	}	
	color/=sum;
	color.a = 1.0;	
	gl_FragColor = color;
}
