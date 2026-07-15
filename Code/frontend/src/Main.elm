port module Main exposing (main)

import Browser
import Browser.Events
import Browser.Navigation as Nav
import Dict exposing (Dict)
import Dijkstra
import GraphData exposing (GraphData, NodeMeta, decodeGraphData, getBestNodeId)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode as Decode
import Svg
import Svg.Attributes as SvgAttr
import Url
import Url.Parser exposing (Parser, (<?>), map, oneOf, parse, s, top)
import Url.Parser.Query as Query

-- ROUTING
type Route
    = Home
    | Planner
    | Map RouteParams

type alias RouteParams =
    { start : Maybe String
    , ziel : Maybe String
    }

routeParser : Parser (Route -> a) a
routeParser =
    oneOf
        [ Url.Parser.map Home top
        , Url.Parser.map Planner (Url.Parser.s "plan")
        , Url.Parser.map (\st zi -> Map { start = st, ziel = zi }) (Url.Parser.s "map" <?> Query.string "start" <?> Query.string "ziel")
        ]

parseUrl : Url.Url -> Route
parseUrl url =
    let
        ( pathStr, queryStr ) =
            case url.fragment of
                Just frag ->
                    case String.split "?" frag of
                        [ p ] -> ( "/" ++ p, Nothing )
                        p :: rest -> ( "/" ++ p, Just (String.join "?" rest) )
                        [] -> ( "/", Nothing )
                Nothing ->
                    ( "/", Nothing )
                
        fragmentUrl =
            { url | path = pathStr, fragment = Nothing, query = queryStr }
    in
    Maybe.withDefault Home (parse routeParser fragmentUrl)

-- PORTS

port sendRoute : { route : List String, startRoom : String, endRoom : String } -> Cmd msg
port routingFailed : String -> Cmd msg
port switchFloor : String -> Cmd msg
port toggleThemeCmd : () -> Cmd msg

-- MAIN

main : Program () Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }

-- MODEL

type DropdownState
    = Closed
    | StartOpen
    | EndOpen

type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , route : Route
    , graphData : Maybe GraphData
    , rooms : List ( String, String ) -- List of (DisplayName, InternalName)
    , startInput : String
    , endInput : String
    , dropdownState : DropdownState
    , errorMsg : Maybe String
    , shake : Bool
    , aktuelleEtage : String
    , currentFloor : String
    }

init : () -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init _ url key =
    ( { key = key
      , url = url
      , route = parseUrl url
      , graphData = Nothing
      , rooms = []
      , startInput = ""
      , endInput = ""
      , dropdownState = Closed
      , errorMsg = Nothing
      , shake = False
      , aktuelleEtage = "00"
      , currentFloor = "EG / 0"
      }
    , Cmd.batch [ fetchGraph, fetchVspUnits ]
    )

-- HTTP & DECODERS

fetchGraph : Cmd Msg
fetchGraph =
    Http.get
        { url = "Data/graph.json"
        , expect = Http.expectJson GotGraph decodeGraphData
        }

fetchVspUnits : Cmd Msg
fetchVspUnits =
    Http.get
        { url = "Data/vsp_units.json"
        , expect = Http.expectJson GotVspUnits decodeVspUnits
        }

formatRoomName : String -> String
formatRoomName internalName =
    let
        parts = String.split "_" internalName
        
        stripZeros s =
            case String.toInt s of
                Just num -> String.fromInt num
                Nothing -> s
    in
    case parts of
        [ b, e, r ] ->
            let
                vsp =
                    case b of
                        "7721" -> "1"
                        "7722" -> "2"
                        "7723" -> "3"
                        "7724" -> "4"
                        _ -> ""
            in
            if vsp /= "" then
                stripZeros e ++ "." ++ stripZeros r ++ " VSP " ++ vsp
            else
                internalName

        _ ->
            internalName

buildRoomList : GraphData -> List ( String, String )
buildRoomList data =
    let
        rawList =
            Dict.toList data.nodeMeta
                |> List.filter (\( _, meta ) -> meta.name /= "")
                |> List.map (\( _, meta ) -> meta.name)
        
        -- Remove duplicates
        uniqueNames =
            rawList
                |> List.foldl (\name acc -> if List.member name acc then acc else name :: acc) []
    in
    List.map (\name -> ( formatRoomName name, name )) uniqueNames

type alias VspUnit =
    { name : String }

decodeVspUnits : Decode.Decoder (List VspUnit)
decodeVspUnits =
    Decode.list (Decode.map VspUnit (Decode.field "name" Decode.string))

buildRoomListFromVsp : List VspUnit -> List ( String, String )
buildRoomListFromVsp units =
    let
        rawList =
            units
                |> List.filter (\u -> u.name /= "")
                |> List.map (\u -> u.name)
        
        -- Remove duplicates
        uniqueList =
            List.foldl (\name acc -> if List.member name acc then acc else name :: acc) [] rawList

        -- Format
        formattedList =
            List.map (\name -> ( formatRoomName name, name )) uniqueList
    in
    List.sortBy Tuple.first formattedList

-- UPDATE

type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | GotGraph (Result Http.Error GraphData)
    | GotVspUnits (Result Http.Error (List VspUnit))
    | UpdateStart String
    | UpdateEnd String
    | FocusStart
    | FocusEnd
    | ClickedMap
    | CloseDropdowns
    | SwitchFloor String
    | SelectStart String
    | SelectEnd String
    | SwapInputs
    | SubmitForm
    | LocationFill
    | ToggleTheme
    | NoOp

calculateRoute : Model -> ( Model, Cmd Msg )
calculateRoute model =
    let
        s = String.trim model.startInput
        e = String.trim model.endInput
    in
    if e == "" then
        ( { model | errorMsg = Just "Bitte wähle mindestens ein Ziel (End) aus.", shake = True }, Cmd.none )
    else
        case model.graphData of
            Nothing ->
                ( { model | errorMsg = Just "Gebäudedaten werden noch geladen..." }, Cmd.none )
            
            Just graphData ->
                let
                    sInternal = getInternalName s model.rooms
                    eInternal = getInternalName e model.rooms

                    startId = getBestNodeId sInternal "tuer" graphData
                    endId = getBestNodeId eInternal "" graphData
                in
                case (startId, endId) of
                    (Just sid, Just eid) ->
                        case Dijkstra.shortestPath sid eid graphData.graph of
                            Just path ->
                                let
                                    startEtage =
                                        case String.split "_" sInternal of
                                            _ :: etage :: _ -> etage
                                            _ -> "00"
                                            
                                    targetFragment = "map?start=" ++ Url.percentEncode sInternal ++ "&ziel=" ++ Url.percentEncode eInternal
                                    
                                    navCmd =
                                        case model.url.fragment of
                                            Just frag ->
                                                if frag == targetFragment then
                                                    Cmd.none
                                                else
                                                    Nav.pushUrl model.key (Url.toString { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just targetFragment })
                                            Nothing ->
                                                Nav.pushUrl model.key (Url.toString { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just targetFragment })
                                in
                                ( { model | errorMsg = Nothing, aktuelleEtage = startEtage }
                                , Cmd.batch
                                    [ sendRoute { route = path, startRoom = sInternal, endRoom = eInternal }
                                    , switchFloor startEtage
                                    , navCmd
                                    ]
                                )
                            Nothing ->
                                ( { model | errorMsg = Just "Keine Route gefunden (Graph ist nicht zusammenhängend)." }, routingFailed "Keine Route" )
                    _ ->
                        ( { model | errorMsg = Just "Start- oder Zielknoten nicht gefunden." }, routingFailed "Raum nicht gefunden" )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            let
                newRoute = parseUrl url
                m1 = { model | url = url, route = newRoute }
            in
            case newRoute of
                Map params ->
                    case (params.start, params.ziel) of
                        (Just s, Just z) ->
                            let
                                m2 = { m1 | startInput = formatRoomName s, endInput = formatRoomName z }
                            in
                            calculateRoute m2
                        _ ->
                            ( m1, Cmd.none )
                _ ->
                    ( m1, Cmd.none )

        GotGraph result ->
            case result of
                Ok loadedGraph ->
                    let
                        baseModel = { model | graphData = Just loadedGraph }
                    in
                    case baseModel.route of
                        Map params ->
                            case (params.start, params.ziel) of
                                (Just s, Just z) ->
                                    let
                                        m1 = { baseModel | startInput = formatRoomName s, endInput = formatRoomName z }
                                    in
                                    calculateRoute m1
                                _ ->
                                    ( baseModel, Cmd.none )
                        _ ->
                            ( baseModel, Cmd.none )

                Err err ->
                    let
                        errStr =
                            case err of
                                Http.BadUrl eMsg -> "BadUrl: " ++ eMsg
                                Http.Timeout -> "Timeout"
                                Http.NetworkError -> "NetworkError"
                                Http.BadStatus status -> "BadStatus: " ++ String.fromInt status
                                Http.BadBody eMsg -> "BadBody: " ++ eMsg
                    in
                    ( { model | errorMsg = Just ("Fehler beim Laden (Graph): " ++ errStr) }, Cmd.none )

        GotVspUnits result ->
            case result of
                Ok units ->
                    ( { model | rooms = buildRoomListFromVsp units }, Cmd.none )
                Err err ->
                    let
                        errStr =
                            case err of
                                Http.BadUrl eMsg -> "BadUrl: " ++ eMsg
                                Http.Timeout -> "Timeout"
                                Http.NetworkError -> "NetworkError"
                                Http.BadStatus status -> "BadStatus: " ++ String.fromInt status
                                Http.BadBody eMsg -> "BadBody: " ++ eMsg
                    in
                    ( { model | errorMsg = Just ("Fehler beim Laden der VSP Units: " ++ errStr) }, Cmd.none )

        UpdateStart val ->
            ( { model | startInput = val, dropdownState = StartOpen, errorMsg = Nothing, shake = False }, Cmd.none )

        UpdateEnd val ->
            ( { model | endInput = val, dropdownState = EndOpen, errorMsg = Nothing, shake = False }, Cmd.none )

        FocusStart ->
            ( { model | dropdownState = StartOpen }, Cmd.none )

        FocusEnd ->
            ( { model | dropdownState = EndOpen }, Cmd.none )

        ClickedMap ->
            ( model, Cmd.none )

        CloseDropdowns ->
            ( { model | dropdownState = Closed }, Cmd.none )

        SelectStart val ->
            ( { model | startInput = val, dropdownState = Closed }, Cmd.none )

        SelectEnd val ->
            ( { model | endInput = val, dropdownState = Closed }, Cmd.none )

        SwapInputs ->
            ( { model | startInput = model.endInput, endInput = model.startInput }, Cmd.none )

        LocationFill ->
            ( { model | startInput = "Campus Eingang Ost" }, Cmd.none )

        SwitchFloor etage ->
            ( { model | aktuelleEtage = etage }, switchFloor etage )

        SubmitForm ->
            calculateRoute model
        
        ToggleTheme ->
            ( model, toggleThemeCmd () )
            
        NoOp ->
            ( model, Cmd.none )

getInternalName : String -> List ( String, String ) -> String
getInternalName display rooms =
    if String.toLower display == "campus eingang ost" then
        "7721_00_111"
    else if String.toLower display == "café einstein" || String.toLower display == "cafe einstein" || String.toLower display == "einstein" then
        "7723_00_010"
    else
        case List.filter (\( d, _ ) -> String.toLower d == String.toLower display) rooms of
            ( _, internal ) :: _ ->
                internal
            [] ->
                display -- fallback

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
    case model.dropdownState of
        Closed ->
            Sub.none
        _ ->
            Browser.Events.onClick (Decode.succeed CloseDropdowns)

-- VIEW

view : Model -> Browser.Document Msg
view model =
    let
        content =
            case model.route of
                Home ->
                    viewHome model

                Planner ->
                    viewPlanner model

                Map _ ->
                    viewMapOverlay model

        onMap =
            case model.route of
                Map _ -> True
                _ -> False
    in
    { title = "KrokenKompass"
    , body =
        [ div
            [ id "map-background"
            , style "display" (if onMap then "block" else "none")
            , style "position" "absolute"
            , style "top" "0"
            , style "left" "0"
            , style "width" "100%"
            , style "height" "100%"
            , style "z-index" "1"
            ]
            [ div [ style "position" "absolute", style "top" "76px", style "bottom" "24px", style "left" "24px", style "right" "24px", style "border-radius" "1.5rem", style "overflow" "hidden", style "background" "#e5e5ea" ]
                [ Html.node "leaflet-map-container" [ style "display" "block", style "width" "100%", style "height" "100%", style "position" "relative" ] []
                ]
            ]
        , content
        ]
    }

viewMapOverlay : Model -> Html Msg
viewMapOverlay model =
    div [ style "position" "absolute", style "top" "0", style "left" "0", style "width" "100%", style "height" "100%", style "pointer-events" "none", style "display" "flex", style "flex-direction" "column", style "z-index" "10" ]
        [ header [ class "header-custom is-flex is-justify-content-space-between is-align-items-center py-4 px-6", style "pointer-events" "auto", style "background" "var(--bulma-scheme-main, #ffffff)" ]
            [ div [ class "is-flex is-align-items-center cursor-pointer", onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Nothing })) ]
                [ Svg.svg
                    [ SvgAttr.class "mr-2"
                    , SvgAttr.fill "currentColor"
                    , SvgAttr.height "20"
                    , SvgAttr.viewBox "0 0 24 24"
                    , SvgAttr.width "20"
                    ]
                    [ Svg.path [ SvgAttr.d "M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" ] [] ]
                , span [ class "has-text-weight-medium is-size-5-desktop is-size-6-mobile" ] [ text "KrokenKompass" ]
                ]
            , div [ class "is-flex is-align-items-center" ]
                [ button
                    [ Html.Attributes.attribute "aria-label" "Dark Mode wechseln"
                    , class "theme-toggle mr-4"
                    , id "theme-toggle"
                    , onClick ToggleTheme
                    , style "background" "transparent"
                    , style "border" "none"
                    , style "cursor" "pointer"
                    ]
                    [ Svg.svg
                        [ SvgAttr.fill "none"
                        , SvgAttr.height "20"
                        , SvgAttr.id "moon-icon"
                        , SvgAttr.stroke "currentColor"
                        , SvgAttr.strokeLinecap "round"
                        , SvgAttr.strokeLinejoin "round"
                        , SvgAttr.strokeWidth "2"
                        , SvgAttr.viewBox "0 0 24 24"
                        , SvgAttr.width "20"
                        ]
                        [ Svg.path [ SvgAttr.d "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" ] [] ]
                    , Svg.svg
                        [ SvgAttr.fill "none"
                        , SvgAttr.height "20"
                        , SvgAttr.id "sun-icon"
                        , SvgAttr.stroke "currentColor"
                        , SvgAttr.strokeLinecap "round"
                        , SvgAttr.strokeLinejoin "round"
                        , SvgAttr.strokeWidth "2"
                        , SvgAttr.viewBox "0 0 24 24"
                        , SvgAttr.width "20"
                        ]
                        [ Svg.circle [ SvgAttr.cx "12", SvgAttr.cy "12", SvgAttr.r "5" ] []
                        , Svg.line [ SvgAttr.x1 "12", SvgAttr.x2 "12", SvgAttr.y1 "1", SvgAttr.y2 "3" ] []
                        , Svg.line [ SvgAttr.x1 "12", SvgAttr.x2 "12", SvgAttr.y1 "21", SvgAttr.y2 "23" ] []
                        , Svg.line [ SvgAttr.x1 "4.22", SvgAttr.x2 "5.64", SvgAttr.y1 "4.22", SvgAttr.y2 "5.64" ] []
                        , Svg.line [ SvgAttr.x1 "18.36", SvgAttr.x2 "19.78", SvgAttr.y1 "18.36", SvgAttr.y2 "19.78" ] []
                        , Svg.line [ SvgAttr.x1 "1", SvgAttr.x2 "3", SvgAttr.y1 "12", SvgAttr.y2 "12" ] []
                        , Svg.line [ SvgAttr.x1 "21", SvgAttr.x2 "23", SvgAttr.y1 "12", SvgAttr.y2 "12" ] []
                        , Svg.line [ SvgAttr.x1 "4.22", SvgAttr.x2 "5.64", SvgAttr.y1 "19.78", SvgAttr.y2 "18.36" ] []
                        , Svg.line [ SvgAttr.x1 "18.36", SvgAttr.x2 "19.78", SvgAttr.y1 "5.64", SvgAttr.y2 "4.22" ] []
                        ]
                    ]
                , button
                    [ class "button is-info is-rounded header-action-button has-text-weight-medium px-5"
                    , onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "plan" }))
                    ]
                    [ text "Neue Route" ]
                ]
            , case model.errorMsg of
                Just err ->
                    div [ id "info-box", style "pointer-events" "auto", class "has-text-danger has-text-weight-bold" ] [ text err ]
                Nothing ->
                    case model.graphData of
                        Nothing -> div [ id "info-box", style "pointer-events" "auto" ] [ text "Lade Gebäudedaten..." ]
                        Just _ -> text ""
            ]
        , div [ id "etagen-menue", style "pointer-events" "auto", style "position" "absolute", style "top" "100px", style "left" "48px", style "background" "var(--bulma-scheme-main, #ffffff)", style "padding" "8px", style "border-radius" "1rem", style "box-shadow" "0 4px 15px rgba(0, 0, 0, 0.08)", style "display" "flex", style "flex-direction" "column", style "gap" "2px", style "min-width" "80px" ]
            [ div [ class "etagen-label", style "font-size" "0.75rem", style "color" "#8e8e93", style "padding" "4px 8px" ] [ text "Etage" ]
            , viewFloorButton model "05" "5"
            , viewFloorButton model "04" "4"
            , viewFloorButton model "03" "3"
            , viewFloorButton model "02" "2"
            , viewFloorButton model "01" "1"
            , viewFloorButton model "00" "EG / 0"
            , viewFloorButton model "-1" "-1"
            ]
        ]

viewFloorButton : Model -> String -> String -> Html Msg
viewFloorButton model etage label =
    let
        isActive = model.aktuelleEtage == etage
        activeClass = if isActive then " active" else ""
    in
    button
        [ class ("etagen-btn" ++ activeClass)
        , style "border-radius" "0.5rem"
        , style "width" "100%"
        , style "justify-content" "flex-start"
        , style "padding" "6px 8px"
        , style "height" "auto"
        , onClick (SwitchFloor etage)
        ]
        [ text label ]


viewHome : Model -> Html Msg
viewHome model =
    div [ style "display" "flex", style "flex-direction" "column", style "min-height" "100vh" ]
        [ viewHeader model
        , Html.section [ class "hero is-medium mt-4", style "flex-grow" "1" ]
            [ div [ class "hero-body has-text-centered is-flex is-flex-direction-column is-justify-content-center" ]
                [ div [ class "container is-max-widescreen" ]
                    [ h1 [ class "title hero-title-custom" ]
                        [ text "Finde deinen Weg über"
                        , br [] []
                        , text "den Campus."
                        ]
                    , p [ class "subtitle hero-subtitle-custom is-size-5 mt-4", style "font-weight" "300" ]
                        [ text "Suche nach Gebäuden oder Räumen und starte die Navigation." ]
                    , div [ class "buttons is-centered mt-5 hero-buttons-custom" ]
                        [ button [ class "button is-info is-medium is-rounded has-text-weight-medium px-6", onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "plan" })) ]
                            [ text "Raum finden" ]
                        , button [ class "button button-secondary is-medium is-rounded px-6", onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "map" })) ]
                            [ text "Zur Karte" ]
                        ]
                    ]
                ]
            ]
        , viewAbstractCards
        , viewFooter
        ]

viewAbstractCards : Html Msg
viewAbstractCards =
    Html.section [ class "section pt-0 pb-6 mt-4" ]
        [ div [ class "container is-max-widescreen" ]
            [ div [ class "columns is-variable is-3" ]
                [ div [ class "column" ]
                    [ div [ class "abstract-card", style "background-color" "#B2D8C6" ]
                        [ div [ class "color-block", style "flex-direction" "column", style "bottom" "40px", style "left" "40px" ]
                            [ span [ class "color-square", style "background-color" "#007AFF" ] []
                            , span [ class "color-square", style "background-color" "#FFD60A" ] []
                            , span [ class "color-square", style "background-color" "#FF375F" ] []
                            , span [ class "color-square", style "background-color" "#34C759" ] []
                            ]
                        ]
                    ]
                , div [ class "column" ]
                    [ div [ class "abstract-card", style "background-color" "#EBBCA4" ]
                        [ div [ class "color-block", style "flex-direction" "row", style "bottom" "40px", style "left" "40px" ]
                            [ span [ class "color-square", style "background-color" "#FF3B30" ] []
                            , span [ class "color-square", style "background-color" "#000000" ] []
                            , span [ class "color-square", style "background-color" "#FFFFFF" ] []
                            , span [ class "color-square", style "background-color" "#5AC8FA" ] []
                            ]
                        ]
                    ]
                , div [ class "column" ]
                    [ div [ class "abstract-card", style "background-color" "#A9BCE4" ]
                        [ div [ class "color-block", style "flex-direction" "column", style "top" "50%", style "left" "50%", style "transform" "translate(-50%, -50%)" ]
                            [ span [ class "color-square", style "background-color" "#34C759" ] []
                            , span [ class "color-square", style "background-color" "#FF9500" ] []
                            , span [ class "color-square", style "background-color" "#1C1C1E" ] []
                            ]
                        ]
                    ]
                , div [ class "column" ]
                    [ div [ class "abstract-card", style "background-color" "#BBDD9B" ]
                        [ div [ class "color-block", style "flex-direction" "column", style "top" "40px", style "right" "40px" ]
                            [ span [ class "color-square", style "background-color" "#FF3B30" ] []
                            , span [ class "color-square", style "background-color" "#FFFFFF" ] []
                            , span [ class "color-square", style "background-color" "#007AFF" ] []
                            , span [ class "color-square", style "background-color" "#0040DD" ] []
                            , span [ class "color-square", style "background-color" "#34C759" ] []
                            ]
                        ]
                    ]
                ]
            ]
        ]

viewPlanner : Model -> Html Msg
viewPlanner model =
    div
        [ style "position" "relative"
        , style "z-index" "10"
        , style "display" "flex"
        , style "flex-direction" "column"
        , style "min-height" "100vh"
        , style "background" "var(--bulma-scheme-main, #ffffff)"
        ]
        [ viewHeader model
        , Html.main_ [ class "section py-4 is-flex-grow-1 is-flex is-flex-direction-column", style "background-color" "transparent", style "justify-content" "center", style "align-items" "center" ]
            [ div [ class "container is-max-widescreen is-flex-grow-1 w-100", style "display" "flex", style "flex-direction" "column", style "justify-content" "center", style "align-items" "center" ]
                [ h2 [ class "title has-text-centered mb-5 is-size-3" ] [ text "Route planen" ]
                , viewRoutePlanner model
                ]
            ]
        , viewFooter
        ]

viewHeader : Model -> Html Msg
viewHeader model =
    header [ class "header-custom is-flex is-justify-content-space-between is-align-items-center py-4 px-6", style "background" "var(--bulma-scheme-main, #ffffff)", style "pointer-events" "auto" ]
        [ div [ class "is-flex is-align-items-center cursor-pointer", onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Nothing })) ]
            [ Svg.svg
                [ SvgAttr.class "mr-2"
                , SvgAttr.fill "currentColor"
                , SvgAttr.height "24"
                , SvgAttr.viewBox "0 0 24 24"
                , SvgAttr.width "24"
                ]
                [ Svg.path [ SvgAttr.d "M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" ] [] ]
            , span [ class "has-text-weight-medium is-size-5-desktop is-size-6-mobile" ] [ text "KrokenKompass" ]
            ]
        , div [ class "is-flex is-align-items-center" ]
            [ button
                [ class "theme-toggle mr-4"
                , id "theme-toggle"
                , attribute "aria-label" "Dark Mode wechseln"
                , onClick ToggleTheme
                , style "background" "transparent"
                , style "border" "none"
                , style "cursor" "pointer"
                ]
                [ Svg.svg
                    [ SvgAttr.id "moon-icon"
                    , SvgAttr.fill "none"
                    , SvgAttr.height "20"
                    , SvgAttr.stroke "currentColor"
                    , SvgAttr.strokeLinecap "round"
                    , SvgAttr.strokeLinejoin "round"
                    , SvgAttr.strokeWidth "2"
                    , SvgAttr.viewBox "0 0 24 24"
                    , SvgAttr.width "20"
                    ]
                    [ Svg.path [ SvgAttr.d "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" ] [] ]
                , Svg.svg
                    [ SvgAttr.id "sun-icon"
                    , SvgAttr.fill "none"
                    , SvgAttr.height "20"
                    , SvgAttr.stroke "currentColor"
                    , SvgAttr.strokeLinecap "round"
                    , SvgAttr.strokeLinejoin "round"
                    , SvgAttr.strokeWidth "2"
                    , SvgAttr.viewBox "0 0 24 24"
                    , SvgAttr.width "20"
                    ]
                    [ Svg.circle [ SvgAttr.cx "12", SvgAttr.cy "12", SvgAttr.r "5" ] []
                    , Svg.line [ SvgAttr.x1 "12", SvgAttr.y1 "1", SvgAttr.x2 "12", SvgAttr.y2 "3" ] []
                    , Svg.line [ SvgAttr.x1 "12", SvgAttr.y1 "21", SvgAttr.x2 "12", SvgAttr.y2 "23" ] []
                    , Svg.line [ SvgAttr.x1 "4.22", SvgAttr.y1 "4.22", SvgAttr.x2 "5.64", SvgAttr.y2 "5.64" ] []
                    , Svg.line [ SvgAttr.x1 "18.36", SvgAttr.y1 "18.36", SvgAttr.x2 "19.78", SvgAttr.y2 "19.78" ] []
                    , Svg.line [ SvgAttr.x1 "1", SvgAttr.y1 "12", SvgAttr.x2 "3", SvgAttr.y2 "12" ] []
                    , Svg.line [ SvgAttr.x1 "21", SvgAttr.y1 "12", SvgAttr.x2 "23", SvgAttr.y2 "12" ] []
                    , Svg.line [ SvgAttr.x1 "4.22", SvgAttr.y1 "19.78", SvgAttr.x2 "5.64", SvgAttr.y2 "18.36" ] []
                    , Svg.line [ SvgAttr.x1 "18.36", SvgAttr.y1 "5.64", SvgAttr.x2 "19.78", SvgAttr.y2 "4.22" ] []
                    ]
                ]
            , case model.route of
                Planner ->
                    button
                        [ class "button is-info is-rounded has-text-weight-medium px-5"
                        , onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "map" }))
                        ]
                        [ text "Zur Karte" ]
                Map _ ->
                    button
                        [ class "button is-info is-rounded has-text-weight-medium px-5"
                        , onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "plan" }))
                        ]
                        [ text "Neue Route" ]
                _ ->
                    button
                        [ class "button is-info is-rounded has-text-weight-medium px-5"
                        , onClick (LinkClicked (Browser.Internal { protocol = model.url.protocol, host = model.url.host, port_ = model.url.port_, path = model.url.path, query = model.url.query, fragment = Just "plan" }))
                        ]
                        [ text "Raum finden" ]
            ]
        ]

viewFooter : Html Msg
viewFooter =
    footer [ class "footer-custom py-5 px-6 is-flex is-justify-content-space-between is-align-items-center", style "border-top" "1px solid var(--bulma-border-weak)" ]
        [ div [ class "is-flex is-align-items-center footer-links-custom" ]
            [ Svg.svg
                [ SvgAttr.class "mr-2"
                , SvgAttr.fill "currentColor"
                , SvgAttr.height "24"
                , SvgAttr.viewBox "0 0 24 24"
                , SvgAttr.width "24"
                ]
                [ Svg.path [ SvgAttr.d "M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" ] [] ]
            , span [ class "has-text-weight-medium is-size-5" ] [ text "KrokenKompass" ]
            ]
        ]

viewRoutePlanner : Model -> Html Msg
viewRoutePlanner model =
    let
        containerClass =
            if model.shake then
                "route-planner-container shake"
            else
                "route-planner-container"
    in
    div [ class containerClass, stopPropagationOn "click" (Decode.succeed ( NoOp, True )) ]
        [ div [ class "route-pill mb-2" ]
            [ div [ class "is-flex is-align-items-center is-flex-grow-1" ]
                [ viewStartIcon
                , input
                    [ class "route-input"
                    , placeholder "Start"
                    , value model.startInput
                    , onInput UpdateStart
                    , onFocus FocusStart
                    , onClick FocusStart
                    ] []
                ]
            , button
                [ class "is-clickable is-flex is-align-items-center is-justify-content-center"
                , id "swapBtn"
                , style "background" "none"
                , style "border" "none"
                , style "padding" "0"
                , style "cursor" "pointer"
                , onClick SwapInputs
                ]
                [ viewSwapIcon ]
            , viewDropdown model model.dropdownState StartOpen model.startInput SelectStart
            ]

        , div [ class "route-line" ] []

        , div [ class "route-pill mt-2" ]
            [ div [ class "is-flex is-align-items-center is-flex-grow-1" ]
                [ viewEndIcon
                , input
                    [ class "route-input"
                    , placeholder "End"
                    , value model.endInput
                    , onInput UpdateEnd
                    , onFocus FocusEnd
                    , onClick FocusEnd
                    ] []
                ]
            , viewMapIcon
            , viewDropdown model model.dropdownState EndOpen model.endInput SelectEnd
            ]

        , case model.errorMsg of
            Just msg ->
                div [ class "has-text-danger is-size-7 mt-3", style "font-weight" "500" ] [ text msg ]
            Nothing ->
                text ""

        , button
            [ class "button is-info is-rounded has-text-weight-medium mt-5"
            , style "padding" "0.75rem 2rem"
            , style "font-size" "1.1rem"
            , onClick SubmitForm
            ]
            [ text "Route finden" ]
        ]

viewDropdown : Model -> DropdownState -> DropdownState -> String -> (String -> Msg) -> Html Msg
viewDropdown model currentState targetState query selectMsg =
    let
        displayStyle =
            if currentState == targetState then
                "flex"
            else
                "none"

        suggestions =
            getSuggestions model.rooms query

        viewItem display =
            div
                [ class "dropdown-item"
                , onClick (selectMsg display)
                ]
                [ text display ]
    in
    div [ class "search-dropdown", style "display" displayStyle ]
        (if List.isEmpty suggestions && query /= "" then
            [ div [ class "dropdown-item", style "cursor" "default", style "color" "#8e8e93" ] [ text "Keine Treffer gefunden" ] ]
         else
            List.map viewItem suggestions
        )

getSuggestions : List (String, String) -> String -> List String
getSuggestions rooms query =
    let
        q = String.toLower query
        defaultList =
            [ "Café Einstein"
            , "Campus Eingang Ost"
            , "2.28 VSP 1"
            , "0.39 VSP 3"
            ]
    in
    if query == "" then
        defaultList
    else
        let
            matches =
                rooms
                    |> List.filter (\( d, internalName ) -> String.contains q (String.toLower d) || String.contains q (String.toLower internalName))
                    |> List.map (\( d, _ ) -> d)
                    |> List.take 15
        in
        -- Include aliases if they match
        let
            aliasMatches =
                [ "Café Einstein", "Campus Eingang Ost" ]
                    |> List.filter (\aliasName -> String.contains q (String.toLower aliasName))
        in
        (aliasMatches ++ matches)
            |> List.foldl (\name acc -> if List.member name acc then acc else name :: acc) []
            |> List.reverse
            |> List.take 15

viewStartIcon : Html Msg
viewStartIcon =
    Svg.svg
        [ SvgAttr.fill "none", SvgAttr.height "24", SvgAttr.viewBox "0 0 26 24", SvgAttr.width "26", SvgAttr.class "is-clickable", onClick LocationFill, style "cursor" "pointer" ]
        [ Svg.rect [ SvgAttr.height "23.6879", SvgAttr.opacity "0", SvgAttr.width "25.8012", SvgAttr.x "0", SvgAttr.y "0" ] []
        , Svg.path [ SvgAttr.d "M1.46505 12.4836L11.0158 12.5227C11.1818 12.5227 11.2404 12.591 11.2404 12.7571L11.2697 22.2395C11.2697 23.8899 13.2619 24.2512 13.9943 22.6887L23.5158 2.27854C24.2678 0.637911 22.9787-0.426543 21.426 0.296114L0.908411 9.83713C-0.517371 10.4914-0.214636 12.4738 1.46505 12.4836Z", SvgAttr.fill "#8e8e93" ] []
        ]

viewSwapIcon : Html Msg
viewSwapIcon =
    Svg.svg
        [ SvgAttr.fill "none", SvgAttr.height "32", SvgAttr.viewBox "0 0 23 32", SvgAttr.width "17" ]
        [ Svg.rect [ SvgAttr.height "31.7733", SvgAttr.opacity "0", SvgAttr.width "22.3926", SvgAttr.x "0", SvgAttr.y "0" ] []
        , Svg.path [ SvgAttr.d "M7.75585 24.9247L7.40234 24.9247C6.92383 24.9247 6.5332 25.3154 6.5332 25.7841C6.5332 26.2626 6.92383 26.6533 7.40234 26.6533L7.7492 26.6533C7.35266 28.3988 5.78978 29.7001 3.91602 29.7001C1.75781 29.7001 0 27.9423 0 25.7744C0 23.6162 1.75781 21.8583 3.91602 21.8583C5.79913 21.8583 7.36826 23.1727 7.75585 24.9247Z", SvgAttr.fill "#8e8e93" ] []
        , Svg.path [ SvgAttr.d "M7.40234 26.6533L15.5371 26.6533C19.5215 26.6533 22.0312 24.5927 22.0312 21.331C22.0312 18.0205 19.5312 15.8232 14.8438 15.3447L7.45117 14.5732C3.71094 14.1826 1.73828 12.6591 1.73828 10.4423C1.73828 8.2353 3.56445 6.84858 6.49414 6.84858L11.6406 6.84858L10.4199 5.84272C10.166 5.62787 9.96094 5.38373 9.81445 5.12006L6.49414 5.12006C2.50977 5.12006 0 7.18061 0 10.4423C0 13.7529 2.50977 15.9599 7.1582 16.4287L14.5801 17.2001C18.3203 17.5908 20.3027 19.1142 20.3027 21.331C20.3027 23.538 18.4668 24.9247 15.5371 24.9247L7.40234 24.9247C6.92383 24.9247 6.5332 25.3154 6.5332 25.7841C6.5332 26.2626 6.92383 26.6533 7.40234 26.6533Z", SvgAttr.fill "#8e8e93" ] []
        , Svg.path [ SvgAttr.d "M15.293 6.51655L15.293 0.764593C15.293 0.129827 14.707-0.241266 14.1992 0.178656L10.7715 2.99116C10.293 3.39155 10.2832 3.88959 10.7715 4.29975L14.1992 7.09272C14.707 7.51264 15.293 7.17084 15.293 6.51655ZM15.3027 10.6962C15.3027 11.165 15.6543 11.4384 16.1133 11.4384L17.7148 11.4384C20.3223 11.4384 22.2168 9.78803 22.2168 7.14155C22.2168 4.52436 20.332 2.8935 17.7246 2.8935L14.2969 2.8935C13.877 2.8935 13.5449 3.22553 13.5449 3.63569C13.5449 4.04584 13.877 4.37787 14.2969 4.37787L17.7246 4.37787C19.4336 4.37787 20.6836 5.35444 20.6836 7.08295C20.6836 8.85053 19.4629 9.94428 17.7148 9.94428L16.084 9.94428C15.6543 9.94428 15.3027 10.2177 15.3027 10.6962Z", SvgAttr.fill "#8e8e93" ] []
        ]

viewEndIcon : Html Msg
viewEndIcon =
    Svg.svg
        [ SvgAttr.fill "none", SvgAttr.height "24", SvgAttr.viewBox "0 0 24 25", SvgAttr.width "23" ]
        [ Svg.rect [ SvgAttr.height "24.3457", SvgAttr.opacity "0", SvgAttr.width "22.9492", SvgAttr.x "0", SvgAttr.y "0" ] []
        , Svg.path [ SvgAttr.d "M1.8457 24.3457C2.30469 24.3457 2.66602 23.9746 2.66602 23.5156L2.66602 16.3086C3.02734 16.2012 4.19922 15.7129 6.12305 15.7129C10.7422 15.7129 13.5938 17.9785 18.0078 17.9785C19.9121 17.9785 20.6836 17.7637 21.6016 17.3535C22.4121 16.9824 22.9492 16.3867 22.9492 15.3613L22.9492 2.73438C22.9492 2.09961 22.4414 1.74805 21.7871 1.74805C21.1816 1.74805 20.0195 2.29492 17.8516 2.29492C13.4277 2.29492 10.5762 0.0292969 5.9668 0.0292969C4.0625 0.0292969 3.30078 0.244141 2.38281 0.654297C1.5625 1.02539 1.02539 1.62109 1.02539 2.64648L1.02539 23.5156C1.02539 23.9648 1.40625 24.3457 1.8457 24.3457ZM2.66602 10.8496L2.66602 6.58203C2.86133 6.15234 4.00391 5.58594 5.9668 5.58594C6.36719 5.58594 6.86523 5.60547 7.31445 5.6543L7.31445 1.73828C9.01367 1.9043 10.5176 2.39258 12.041 2.85156L12.041 6.76758C13.6328 7.26562 15.1367 7.66602 16.7676 7.80273L16.7676 3.88672C17.1191 3.91602 17.4805 3.92578 17.8516 3.92578C19.1797 3.92578 20.3027 3.7793 21.3184 3.48633L21.3184 7.40234C20.6836 7.57812 19.4141 7.8418 17.8516 7.8418C17.4805 7.8418 17.0996 7.82227 16.7676 7.80273L16.7676 12.0703C17.0801 12.0996 17.4316 12.1191 17.8516 12.1191C19.1797 12.1191 20.3027 11.9629 21.3184 11.6699L21.3184 15.3418C21.123 15.7715 19.9902 16.3379 18.0078 16.3379C17.5879 16.3379 17.1777 16.3184 16.7676 16.2793L16.7676 12.0703C15.0781 11.8945 13.7207 11.582 12.041 11.0449L12.041 15.1465C10.5762 14.707 9.0625 14.2578 7.31445 14.1211L7.31445 9.92188C6.85547 9.88281 6.5625 9.85352 5.9668 9.85352C3.99414 9.85352 2.86133 10.4199 2.66602 10.8496ZM7.31445 9.92188C9.05273 10.1074 10.3711 10.5371 12.041 11.0449L12.041 6.76758C10.4688 6.29883 9.0625 5.83008 7.31445 5.6543Z", SvgAttr.fill "#8e8e93" ] []
        ]
viewMapIcon : Html Msg
viewMapIcon =
    Svg.svg
        [ SvgAttr.fill "none", SvgAttr.height "24", SvgAttr.viewBox "0 0 106 121", SvgAttr.width "21", SvgAttr.class "is-flex" ]
        [ Svg.rect [ SvgAttr.x "0", SvgAttr.y "0", SvgAttr.width "105.754", SvgAttr.height "120.239", style "fill-opacity" "0" ] []
        , Svg.path [ SvgAttr.d "M105.754,114.095c0,2.116 -1.75,3.865 -3.866,3.865c-2.116,0 -3.866,-1.75 -3.866,-3.865l0,-110.229c0,-2.157 1.75,-3.866 3.866,-3.866c2.116,0 3.866,1.709 3.866,3.866l0,110.229Z", SvgAttr.fill "#8e8e93" ] []
        , Svg.path [ SvgAttr.d "M10.539,116.211l16.317,-19.409c1.587,-1.872 1.79,-2.319 2.441,-4.313l1.383,-4.272l-8.667,-10.824l-2.767,12.777l-16.113,19.084c-5.127,6.022 3.174,11.963 7.405,6.958Zm39.795,-1.587c3.337,6.714 13.224,2.604 9.644,-4.68l-11.068,-22.461c-0.855,-1.668 -2.035,-3.459 -3.052,-4.923l-7.08,-10.01l0.488,-1.505c1.913,-5.575 2.604,-8.992 3.011,-14.526l1.099,-15.666c0.529,-7.528 -3.906,-13.102 -11.434,-13.102c-5.697,0 -9.522,2.93 -14.811,8.057l-8.301,8.179c-2.685,2.645 -3.622,4.802 -3.866,8.301l-0.976,12.858c-0.244,3.174 1.505,5.453 4.476,5.534c3.011,0.203 4.801,-1.546 5.086,-4.964l1.221,-14.079l3.987,-3.581c1.465,-1.343 3.499,-0.488 3.377,1.058l-0.936,11.922c-0.448,5.982 0.977,8.83 5.086,13.997l10.987,13.753c1.098,1.424 1.261,1.953 1.709,2.848l11.352,22.99Zm18.84,-65.633l-12.573,-0l-8.341,-9.277l-0.855,13.021l3.581,3.581c1.79,1.79 3.296,2.32 6.47,2.32l11.719,0c3.215,0 5.371,-1.872 5.371,-4.842c0,-2.93 -2.197,-4.802 -5.371,-4.802Zm-31.25,-26.164c6.347,0 11.434,-5.086 11.434,-11.434c0,-6.307 -5.086,-11.393 -11.434,-11.393c-6.307,0 -11.393,5.086 -11.393,11.393c0,6.348 5.086,11.434 11.393,11.434Z", SvgAttr.fill "#8e8e93" ] []
        ]
