export function getRandomInt(min, max) {
	min = Math.ceil(min); // Ensure min is an integer
	max = Math.floor(max); // Ensure max is an integer
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomFloat(min, max) {
	return Math.random() * (max - min) + min;
}
export const random = {
	int: getRandomInt,
	float: getRandomFloat,
};
//# sourceMappingURL=random.js.map
