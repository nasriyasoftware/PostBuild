class Helpers {
    is = {
        /**
         * Pass anything to check if it's an object or not
         * @param {*} obj 
         * @returns {boolean}
        */
        realObject(obj) {
            return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
        },
        /**
         * Check whether the argument is a valid string or not
         * @param {*} str 
         * @returns {boolean}
         */
        validString(str) {
            return typeof str === 'string' && str.trim().length > 0;
        },
        /**
         * Check if the value is undefined
         * @param {any} arg 
         * @returns {boolean}
         */
        undefined(arg) {
            return typeof arg === 'undefined'
        },
        integer(value) {
            return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
        }
    }
}

export default new Helpers();