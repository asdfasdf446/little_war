function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        if(value < 80) value += 80; 
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}
module.exports = { stringToColor };
