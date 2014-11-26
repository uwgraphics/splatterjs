uniform sampler2D background;

varying vec2 coord;

void main() {
	gl_FragColor = texture2D(background, coord);
}
