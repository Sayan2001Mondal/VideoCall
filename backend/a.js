



        function groupAnagrams(arr){
            const map = new Map()
            for(let str of arr){
                const key = str.split("").sort().join("")
                if(map.has(key)){
                    map.get(key).push(str)
                }else{
                    map.set(key, [str])
                }
            }
            return Array.from(map.values())
        }


        function groupAnagrams1(words){
            const groups = new Map()

            for(const word of words){
                const normalized = word.split("").sort().join("")

                if(!groups.has(normalized)){
                    groups.set(normalized, [])
                }
                    groups.get(normalized).push(word)
                

            }
            return [...groups.values()]
        }



console.log(groupAnagrams1(["eat", "tea", "tan", "ate", "nat", "bat"]));


console.log(groupAnagrams1([""]));
console.log(groupAnagrams1(["a"])); 
console.log(groupAnagrams1([]));   