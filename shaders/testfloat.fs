uniform sampler2D texture;
uniform vec2 delta;

varying vec2 coord;

vec4 float2Color(float f)
{
    f *= 256.0;
    float r = floor(f);
    f -= r;
    f *= 256.0;
    float g = floor(f);
    f -= g;
    f *= 256.0;
    float b = floor(f);
    return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
}

float color2Float(vec4 c)
{
    return c.r * 255.0 / 256.0 + c.g * 255.0 / (256.0 * 256.0) + c.b * 255.0 / (256.0 * 256.0 * 256.0);
}

void main() {
	gl_FragColor = float2Color(texture2D(texture, coord).r);
}