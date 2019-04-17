/*
 * Справочный файл, в котором предоставлены более подробные комментарии касательно функционирования регулярных выражений,
 * использованных в программе.
 */



/**
 * Изменение знака числа, которого касается каретка
 */
function fPlusMinus() {

    let selEnd = display.selectionEnd;
    let str1 = display.value.slice(0,selEnd);
    let str2 = display.value.slice(selEnd, display.value.length);
        
    // Определяем, соприкасается ли каретка с цифрой.
    // Если нет, то завершаем функцию.
    /* 
       Детали. Проводим ряд тестов:
       /[0-9\.,e]$/.test(str1) - заканчивается ли str1 цифры, точки, запятой или буквы 'e' (обозначающей число Эйлера)
       /^[0-9\.,e]/.test(str2) - начинается ли str2 с цифры, точки, запятой или буквы 'e'
       /pi$/.test(str1) - заканчивается ли str1 на буквосочетание 'pi'
       /^pi/.test(str2) - начинается ли str2 c буквосочетания 'pi'
       /p$/.test(str1) && /^i/.test(str2) - находится ли курсор посередине буквосочетания 'pi'
       Если ни одно из этих условий не сработало, то значит, каретка не соприкасается ни с цифрой, ни с константой,
       следовательно, выводим в лог соответствующее сообщение и выходим из функции.
    */
    if ( !/[0-9\.,e]$/.test(str1) && !/^[0-9\.,e]/.test(str2) && !/pi$/.test(str1) && !/^pi/.test(str2) && !(/p$/.test(str1) && /^i/.test(str2)) ) {
        logWindowOut('<br><span style="color: blue">Каретка не на цифре, операция смены знака не может быть применена</span>');
        display.focus();
        return; }

    // Смена знака.
    /*
       Здесь:
       shieldedOperators.join('|') - наш список операций, о которых знает программа, разделённый символом '|'
       \\s* - любое количество символов пробела
       \\d* - любое количество цифр
       [\\.,ep]? - только один символ из списка [.,ep] (не включая кавычки) или его отсутствие
       $ - обозначает, что выражение стоит в самом конце строки
       Неэкранированные круглые скобки разбивают выражение на группы, с которыми можно работать, как с единым целым.
    */
    let newRegExp = new RegExp('(' + shieldedOperators.join('|') + '|\\()(\\s*)-(\\s*)(\\d*[\\.,ep]?\\d*)$','');
    let newRegExpPi = new RegExp('(' + shieldedOperators.join('|') + '|\\()(\\s*)-(\\s*)pi$','');

    if (/^\s*-\s*[0-9\.,ep]*$/.test(str1))         // отрицательное число в начале строки меняется на положительное
        str1 = str1.replace(/^\s*-\s*([0-9\.,ep]*)$/, '$1');
    else if (/^\s*-\s*pi$/.test(str1))             // отрицательное 'pi' в начале строки (обрабатываем отдельно, поскольку '([0-9\.,ep]*|pi)' здесь ожидаемым образом не работает)
        str1 = str1.replace(/^\s*-\s*pi$/, 'pi');
    else if (newRegExp.test(str1))                 // отрицательное число в середине строки (или в её конце)
        str1 = str1.replace(newRegExp, '$1$2$4');
    else if (newRegExpPi.test(str1))               // отрицательное 'pi' в середине строки
        str1 = str1.replace(newRegExpPi, '$1$2pi');
    else                                           // положительное число в середине строки
        str1 = str1.replace((/([0-9\.,ep]*|pi)$/), '-$1');       // (а вот здесь комплексное выражение '([0-9\.,ep]*|pi)' срабатывает - странно, но факт)

    display.value = str1+str2;
    display.selectionEnd = str1.length;
    display.focus();
}



/**
 * Форматирование выражения для использования в вычислениях
 */
function calculateFormat(data) {

    // Если при записи дробных чисел использованы запятые,
    // то они интерпретируются как точки )
    data = data.replace(/,/g, '.');    // 'g' означает глобальный поиск, обрабатываются все случаи по всей строке

    // Перевод символов строки в нижний регистр
    data = data.toLowerCase();

    // Замена 'tan'->'tg', 'log10'->'lg'
    data = data.replace(/tan/g, 'tg');
    data = data.replace(/log10/g, 'lg');

    // Очистка концов выражения от наиболее распространённого мусора,
    // который мог быть прихвачен при копировании (такого как кавычки).
    // Умышленно исключаем из очистки символы мат.операций,
    // поскольку лучше выдать ошибку, чем вычислить неполностью скопированный пример.
    data = data.replace(/^[^0-9a-z\.\(\+\-\*\/\^\!]+/, '');
    data = data.replace(/[^0-9a-z\)\+\-\*\/\^\!]+$/, '');

    // Если пользователь ввёл числа в виде '.3' или '-.2', то перед точкой вставляем '0'
    data = data.replace(/^\./,'0.');                 // в начале строки
    data = data.replace(/([\D])(\.\d)/g, '$10$2');   // в середине строки ('\D' - любой нецифровой символ)

    // Преобразование операторов и скобок.
    // Вокруг знаков операторов и скобок размещаем ровно один пробел.
    // ('Некрасивость' этой команды в том, что пробелы между последовательно
    //  найденными символами суммируются.)
    data = data.replace(
        new RegExp('\\s*(' + shieldedOperators.join('|')+'|\\(|\\))\\s*', 'g'),
        ' $1 '
    );

    // Там, где получилось 2 и более пробелов, схлопываем их.
    // И сразу же удаляем пробелы с концов строки.
    data = data.replace(/\s{2,}/g, ' ').trim();   // '\s{2,}' означает два пробела или более

    // Отфильтровка случаев, когда знак минус является признаком отрицательности числа,
    // а не символом мат.операции.
    // Вначале обрабатываем случай, когда отрицательное значение стоит в самом начале выражения.
    // В том числе учитываем существование мат.констант.
    data = data.replace(/^-\s?(\d+|pi|e)/, '-$1');

    // Общий случай, когда отрицательное число в середине выражения.
    // (Неэкранированные круглые скобки разбивают выражение на группы, с которыми можно работать, как с единым целым.)
    data = data.replace(
        new RegExp('(' + shieldedOperators.join('|') + '|\\()\\s?-\\s?(\\d+|pi|e)', 'g'),
        '$1 -$2'
    );

    // Обрабатываем случай, когда выражение начинается с '-(', '-sin' и т.п.
    data = data.replace(
        new RegExp('^-\\s?(' + shieldedOperators.join('|')+'|\\()'),
        '0 - $1'
    );

    // Обрабатываем случаи с выражениями '(-(', '(-sin' и т.п.
    data = data.replace(
        new RegExp('\\(\\s?-\\s?(' + shieldedOperators.join('|')+'|\\()', 'g'),
        '( 0 - $1'
    );

    // Выводим в лог-окно получившуюся отформатированную строку
    logWindowOut('','Воспринятое выражение:',data);

    return data;
}