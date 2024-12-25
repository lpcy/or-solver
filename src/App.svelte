<svelte:head>
	<title>单纯形表</title>
</svelte:head>
<script>
  import * as math from 'mathjs';
  function calc(prob, it){
        let A = it.A;
        let basic = it.basic;
        let b = it.b;
        let cv = [];
        let basicC = basic.map(b => prob.c[b - 1]);
        for(let i=0;i<prob.varLen;i++){
            let cx = prob.c[i];
            let col = math.column(A, i);
            let v = cx - math.dot(col, basicC);
            cv.push(v);
        }
        const maxCV = Math.max(...cv);
        let ratio = null;
        let maxCVIndex = -1;
        let minRIndex = -1;
        if(maxCV > 0){
            maxCVIndex = cv.indexOf(maxCV);
            let maxCVColumn = math.squeeze(math.column(A, maxCVIndex));
            ratio = math.dotDivide(b, maxCVColumn);
            const positiveValues = ratio.filter(value => value >= 0);
            if (positiveValues.length > 0){
                const minV = Math.min(...positiveValues);
                minRIndex = ratio.indexOf(minV);
            }
        }
        let z = math.dot(b, basicC);
        return Object.assign(it, {
            'cv' : cv,
            'z' : z,
            'ratio' : ratio,
            'maxCVIndex': maxCVIndex,
            'minRIndex' : minRIndex
        });
    }
    function rotate(prob, it){
        let preUnit = null;
        let newBasic = [];
        for(let i=0;i<it.basic.length;i++){
            let ba = it.basic[i];
            if(ba == it.basic[it.minRIndex]){
                ba = it.maxCVIndex + 1;
            }
            newBasic.push(ba);
            const col = math.column(it.A, ba -1);
            if(preUnit){
                preUnit = math.concat(preUnit, col);
            }else{
                preUnit = col;
            }
        }
        const inv = math.inv(preUnit);
        let newA =  math.multiply(inv, it.A);
        let newB = math.multiply(inv, it.b);
        return {
            'basic' : newBasic,
            'A': newA,
            'b': newB
        }
    }
    function iter(probInput){
        let slackVar = probInput.A.length;
        let slackStartIndex = probInput.c.length + 1;
        let prob = {
            'varLen': probInput.c.length + slackVar,
            'c': probInput.c.concat(Array.from({ length: slackVar }, () => 0)),
            'A': math.concat(probInput.A, math.identity(slackVar)).toArray(),
            'b': probInput.b
        }
        let basic = Array.from({ length: slackVar }, (_,i) => i + slackStartIndex);
        let it = {
                    'basic' : basic,
                    'A': prob.A,
                    'b': prob.b
                };
        let its = [];
        let errMsg = "";
        let latest = null;
        for(let i=0;i<101;i++){
            if(i == 100){
                errMsg = "无法计算(计算次数过多)!";
                break;
            }else if(i == 0){
                it = calc(prob,it);
            }else{
                it = calc(prob, rotate(prob, it));
            }
            its.push(it);
            if(it.maxCVIndex == -1){
                break;
            }else if(it.minRIndex == -1){
                latest = {
                    'unbounded' : true
                }
                break;
            }
        }
        if(!errMsg && !latest ){
            latest = {"bv":[]};
            let lastIt = its[its.length - 1];
            for(let i=0;i< source.vLen;i++){
                let va = i + 1; 
                let baIndex = lastIt.basic.indexOf(va);
                let vaB = 0;
                if(baIndex != -1){
                    vaB = lastIt.b[baIndex];
                }
                latest.bv.push(vaB);
            }
            latest.z = lastIt.z;
        }
        return {
            'prob': prob,
            'its' : its,
            'latest' : latest,
            'errMsg' : errMsg
        }
    }
    let source = $state({
        "vLen": 0,
        "cLen": 0,
        'v': new Array(10),
        'c': math.zeros(10,10).toArray(),
        'b': new Array(10)
    });
    let target = $state(null);
    function genModel(){
      let block =  math.subset(source.c, math.index(math.range(0, source.cLen), math.range(0, source.vLen)));
      let toNum = value => math.number(value);
      let bInput = math.map(source.b.slice(0, source.cLen),toNum);
      if(bInput.some(value => value < 0)){
        target = {"errMsg" : "右端常数项应大于等于0"};
        return;
      }
      try{
        target = iter({
          'c': math.map(source.v.slice(0, source.vLen),toNum),
          'A': math.map(block,toNum),
          'b': bInput
        });
      }catch(err){
        target = {"errMsg" : err};
      }
    }
    function example(){
        source.vLen = 2;
        source.cLen = 2;
        [source.v[0], source.v[1]] = [50, 30];
        [source.c[0][0], source.c[0][1], source.c[1][0], source.c[1][1]] = [4, 3, 2, 1];
        [source.b[0], source.b[1]] = [120, 50];
        genModel();
    }
</script>

<main>
  <div class="content">
    <div class="row">
      变量数量: <select bind:value={source.vLen}>
        {#each {length:9},index}
          <option>{index + 1}</option>
        {/each}
      </select>
      约束数量: <select bind:value={source.cLen}>
        {#each {length:9},index}
          <option>{index + 1}</option>
        {/each}
      </select>
    </div>
    <div class="row">
        {#if source.vLen > 0}
            Max
        {/if}
        {#each {length:source.vLen},index}
        {#if index!=0} + {/if}
        <span class="input-group">
            <input type="text" bind:value={source.v[index]}/>
            X<sub>{index + 1}</sub>
        </span>
        {/each}
    </div>
    {#each {length:source.cLen},i}
        <div class="row">
            {#each {length:source.vLen},j}
            {#if j!=0} + {/if}
            <span class="input-group">
                <input type="text" bind:value={source.c[i][j]}>
                X<sub>{j + 1}</sub>
            </span>
            {/each}
            &#x2264;<input type="text" bind:value={source.b[i]}>
        </div>
    {/each}
    {#if source.vLen > 0}
        {#each {length:source.vLen},j}
            {#if j!=0} , {/if}
            X<sub>{j + 1}</sub>
        {/each}
        &#x2265;0
    {/if}
    <div class="row">
        <button onclick={genModel}>生成</button>
    </div>
    {#if target}
    <div class="row">
        {#if target.errMsg}
            {target.errMsg}
        {:else}
        <table>
            <thead>
                <tr>
                    <th colspan="2">C<sub>j</sub>&#x2192;</th>
                    {#each target.prob.c as c}
                        <th>{c}</th>
                    {/each}
                    <th></th>
                    <th rowspan="2">&#x3B8;</th>
                </tr>
                <tr>
                    <th>C<sub>b</sub></th>
                    <th>X<sub>b</sub></th>
                    {#each target.prob.c as c,index}
                        <th>X<sub>{index + 1}</sub></th>
                    {/each}
                    <th>b</th>
                </tr>
            </thead>
            <tbody>
                {#each target.its as it}
                {#each {length:it.A.length},index}
                <tr>
                    <td>{target.prob.c[it.basic[index] - 1]}</td>
                    <td>X<sub>{it.basic[index]}</sub></td>
                    {#each {length:it.A[0].length},col}
                    <td>
                        <span class:rotate={index==it.minRIndex&&col==it.maxCVIndex}>
                            {it.A[index][col]}
                        </span>
                    </td>
                    {/each}
                    <td>
                        {it.b[index]}
                    </td>
                    <td>
                        {it.ratio ? it.ratio[index] : ""}
                    </td>
                </tr>
                {/each}
                <tr>
                    <td colspan="2">&#x3C3;<sub>j</sub></td>
                    {#each it.cv as cv}
                        <td>{cv}</td>
                    {/each}
                    <td colspan="2">z={it.z}</td>
                </tr>
                {/each}
            </tbody>
        </table>        
    {/if}
    </div>
    <div class="row">
        {#if target.latest}
            {#if target.latest.unbounded}
                无界解
            {:else}
            最优解：{#each target.latest.bv as b,index}
                        <span>
                            X<sub>{index + 1}</sub>
                        </span>
                        ={b}, 
                    {/each}
            最优值：{target.latest.z}
            {/if}
        {/if}
    </div>
    {:else if source.vLen == 0}
        <button class="to-example" onclick={example}>查看示例</button>
    {/if}
  </div>
</main>
